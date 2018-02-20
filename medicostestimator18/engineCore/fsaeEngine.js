//-------------------------------------------------------------------------------------------------
// fsaeEngine.js
//
// Copyright (C) 2015 Mercer LLC, All Rights Reserved.
//
// Contains the FSAE calculation engine's methods.  See also fsaeConfig.js for the configuration.
//
// IMPORTANT NOTE:  Generally, modification to the methods in the FSAE engine shouldn't be needed
//   unless the current version doesn't allow for some feature of a particular FSAE.  In that case,
//   the correct approach would be to extend the model by defining and adding new configuration
//   properties in fsaeConfig.js, followed by corresponding logic to validate the new properties in
//   fsaeValidation.js, and finally new logic to interpret the new properties in the engine logic
//   below.  Avoid adding non-generalized company/plan-specific logic directly in the engine.
//

//-------------------------------------------------------------------------------------------------
// Declare other referenced JS files to enable Visual Studio IntelliSense.
/// <reference path="~/js/engineCore/trace.js" />
/// <reference path="~/js/engineCore/utility.js" />

//-------------------------------------------------------------------------------------------------
// jslint options.  See http://www.jslint.com
/*jslint white:true, nomen:true, continue:true, plusplus:true, sloppy:true */
/*global TRACE, formatDollar, isArray, isNullOrUndefined */

// Everything in this file hangs off the following object, so we don't litter the global namespace.
var FSAE_ENGINE = {};
FSAE_ENGINE._definition = function() { // IMPORTANT: Gets called at end of the file.
"use strict";
if (this._defined) { return; }

this.objName = "FSAE_ENGINE"; // For use in trace output
this.version = "1.0.25"; // Update for each published release of the engine.

this.calculateContributions = function (config, accountTypeId, totalCosts, rolloverAmount)
{
	///	<summary>
	///	Private (intended) helper method for calculate(). Calculates the user's suggested
	/// contribution and employer matching contribution, if applicable, subjecting both to the
	/// limits configured, if any.
	///	</summary>
	///	<param name="config" type="Object">The FSAE configuration object.</param>
	///	<param name="accountTypeId" type="String">The account type id.</param>
	///	<param name="totalCosts" type="Number">The total eligible costs.</param>
	///	<param name="rolloverAmount" type="Number">The rollover amount.</param>
	///	<returns type="Object">Object containing the resulting contribution amounts.  The contained
	///     properties are "suggestedContribution" and "employerMatchingContribution", both numbers.
	/// </returns>

	var result, contributionMinimum, contributionMaximum, employerMatchRate, employerMaxMatchAmount,
		remainingCosts, limitedCosts, suggested1, suggested2, suggestedContribution, employerMatchingContribution;
	contributionMinimum = config.accountTypes[accountTypeId].contributionMinimum || 0; // Applies to user's only
	contributionMaximum = config.accountTypes[accountTypeId].contributionMaximum || Infinity; // Applies to combined
	employerMatchRate = config.accountTypes[accountTypeId].employerMatchRate || 0;
	employerMaxMatchAmount = config.accountTypes[accountTypeId].employerMaxMatchAmount || Infinity;
	if (totalCosts > 0) {
		remainingCosts = Math.max(0, totalCosts - rolloverAmount);
		limitedCosts = Math.min(contributionMaximum, remainingCosts);
		suggested1 = limitedCosts / (1 + employerMatchRate);
		suggested2 = limitedCosts - employerMaxMatchAmount;
		suggestedContribution = Math.max(contributionMinimum, Math.max(suggested1, suggested2));
	}
	else {
		suggestedContribution = 0;
	}
	employerMatchingContribution = Math.min(employerMaxMatchAmount, suggestedContribution * employerMatchRate);
	result =
	{
		suggestedContribution: suggestedContribution,
		employerMatchingContribution: employerMatchingContribution
	};
	return result;
};

this.calculateFederalIncomeTax = function(config, income, filingStatusId, numberOfDependents)
{
	///	<summary>
	///	Private (intended) helper method for calculate().  Calculates estimated federal
	/// income tax owed on the passed-in income amount, given a filing status and number of dependents.
	///	</summary>
	///	<param name="config" type="Object">The FSAE configuration object.</param>
	///	<param name="income" type="Number">The total annual income amount.</param>
	///	<param name="filingStatusId" type="String">The filing status id; see calculate().</param>
	///	<param name="numberOfDependents" type="Number">The number of dependents, excluding any spouse.</param>
	///	<returns type="Number">The resulting estimated federal income tax amount.</returns>

	var i, result, personalExemption, dependentExemption, standardDeduction, brackets, incomeTaxRates,
		taxableIncome, taxableAtBracket, taxedSoFar;
	personalExemption = config.federalIncomeTax.personalExemptions[filingStatusId];
	dependentExemption = config.federalIncomeTax.dependentExemption;
	standardDeduction = config.federalIncomeTax.standardDeductions[filingStatusId];
	brackets = config.federalIncomeTax.brackets[filingStatusId];
	incomeTaxRates = config.federalIncomeTax.rates[filingStatusId];
	// Adjust income to determine taxable income.
	taxableIncome = income - personalExemption - (numberOfDependents * dependentExemption) - standardDeduction;
	// Calculate tax at each income tax bracket and rate.
	for (i = 0, result = 0, taxedSoFar = 0; i < brackets.length; ++i)
	{
		taxableAtBracket = Math.min(brackets[i], taxableIncome) - taxedSoFar;
		result += incomeTaxRates[i] * taxableAtBracket;
		taxedSoFar += taxableAtBracket;
	}
	// Handle income in excess of last bracket; i.e. at the top rate.
	taxableAtBracket = taxableIncome - taxedSoFar;
	result += incomeTaxRates[i] * taxableAtBracket;
	return result;
};

this.calculateFicaPayrollTaxes = function(config, income)
{
	///	<summary>
	///	Private (intended) helper method for calculate().  Calculates estimated FICA payroll
	/// taxes owed on the passed-in income amount.
	///	</summary>
	///	<param name="config" type="Object">The FSAE configuration object.</param>
	///	<param name="income" type="Number">The total annual income amount.</param>
	///	<returns type="Number">The resulting estimated FICA payroll taxes amount.</returns>

	var result, socialSecurityLimit, socialSecurityRate, medicareRate;
	socialSecurityLimit = config.ficaPayrollTaxes.socialSecurityLimit;
	socialSecurityRate = config.ficaPayrollTaxes.socialSecurityRate;
	medicareRate = config.ficaPayrollTaxes.medicareRate;
	if (income >= socialSecurityLimit)
	{
		result = (socialSecurityLimit * socialSecurityRate) + (medicareRate * income);
	}
	else
	{
		result = (socialSecurityRate + medicareRate) * income;
	}
	return result;
};

this.calculate = function(config, accountTypeId, filingStatusId, numberOfDependents, primaryAnnualIncome,
	spouseAnnualIncome, rolloverAmount, costAmountOrAmounts)
{
	///	<summary>
	///	This is the main method to perform the FSAE (Flexible Spending Account Estimator) calculations.
	///	</summary>
	///	<param name="config" type="Object">The FSAE configuration object.</param>
	///	<param name="accountTypeId" type="String">One of the configured account type ids.</param>
	///	<param name="filingStatusId" type="String">The user's filing status id, which must be one
	///     of "single", "marriedFilingJoint", "marriedFilingSeparate", or "headOfHousehold".</param>
	///	<param name="numberOfDependents" type="Number">The user's number of dependents, excluding the spouse.</param>
	///	<param name="totalAnnualIncome" type="Number">The total annual income for tax purposes.  If filing
	///    status id is "marriedFilingJoint", pass family income, otherwise pass user's own income.</param>
	///	<param name="rolloverAmount" type="Number">A rollover amount from the previous plan year.
	///     Pass zero if not applicable to the account type.</param>
	///	<param name="costAmountOrAmounts" type="Object">A single Number, or an array of Numbers that will be
	///     combined into a single total eligible costs amount.</param>
	///	<returns type="Object">An object containing the results of the calculation.  The various result values
	///     currently returned are numbers representing dollar amounts. If formatting is required, it will
	///     need to be applied by user interface logic.
	/// </returns>

	var i, startDateTime, totalCosts, contributions, suggestedContribution, employerMatchingContribution,
		incomeBefore, incomeAfter, federalIncomeTaxSavings, ficaTaxSavings, totalTaxSavings, totalMatchAndTaxSavings,
		results, resultsToRound, endDateTime, elapsedMsec;

	TRACE.writeLine("{0}.calculate() called.", this.objName);

	startDateTime = new Date();

	if (accountTypeId === "")
	{
		// Apply default of first-listed account type.
		accountTypeId = config.accountTypesOrder[0];
	}

	if (!config.accountTypes.hasOwnProperty(accountTypeId))
	{
		throw new Error("Invalid accountTypeId " + accountTypeId);
	}

	switch (filingStatusId)
	{
		case "single":
		case "marriedFilingJoint":
		case "marriedFilingSeparate":
		case "headOfHousehold":
			break;

		case "":
			// Apply default of "single" filing status.
			filingStatusId = "single";
			break;

		default:
			throw new Error("Invalid filingStatusId " + filingStatusId);
	}

	// Accumulate all costs into a single total.
	if (isArray(costAmountOrAmounts))
	{
		totalCosts = 0;
		for (i = 0; i < costAmountOrAmounts.length; ++i)
		{
			totalCosts += costAmountOrAmounts[i];
		}
	}
	else
	{
		totalCosts = costAmountOrAmounts;
	}

	// Calculate suggested employee and employer matching contributions.
	contributions = this.calculateContributions(config, accountTypeId, totalCosts, rolloverAmount);
	suggestedContribution = contributions.suggestedContribution;
	employerMatchingContribution = contributions.employerMatchingContribution;

	// Calculate estimate of federal income tax savings.  Include spouse's income if applicable filing status.
	incomeBefore = primaryAnnualIncome + (filingStatusId === "marriedFilingJoint" ? spouseAnnualIncome : 0);
	incomeAfter = Math.max(0, incomeBefore - suggestedContribution);
	federalIncomeTaxSavings =
		this.calculateFederalIncomeTax(config, incomeBefore, filingStatusId, numberOfDependents) -
		this.calculateFederalIncomeTax(config, incomeAfter, filingStatusId, numberOfDependents);

	// Calculate estimate of FICA payroll taxes savings.  Note: Payroll tax savings are only on primary's income.
	incomeBefore = primaryAnnualIncome;
	incomeAfter = Math.max(0, incomeBefore - suggestedContribution);
	ficaTaxSavings =
		this.calculateFicaPayrollTaxes(config, incomeBefore) -
		this.calculateFicaPayrollTaxes(config, incomeAfter);

	totalTaxSavings = ficaTaxSavings + federalIncomeTaxSavings;

	totalMatchAndTaxSavings = employerMatchingContribution + totalTaxSavings;

	results =
	{
		accountTypeId: accountTypeId,
		accountTypeDescription: descriptionHelper(config.accountTypes[accountTypeId]),
		totalCosts: totalCosts,
		suggestedContribution: suggestedContribution,
		employerMatchingContribution: employerMatchingContribution,
		federalIncomeTaxSavings: federalIncomeTaxSavings,
		ficaTaxSavings: ficaTaxSavings,
		totalTaxSavings: totalTaxSavings,
		totalMatchAndTaxSavings: totalMatchAndTaxSavings
	};

	// Round all of these dollar amount results to the nearest penny.
	resultsToRound = [
		"totalCosts",
		"suggestedContribution",
		"employerMatchingContribution",
		"federalIncomeTaxSavings",
		"ficaTaxSavings",
		"totalTaxSavings",
		"totalMatchAndTaxSavings"
	];
	for (i = 0; i < resultsToRound.length; ++i)
	{
		results[resultsToRound[i]] = Math.round(results[resultsToRound[i]] * 100) / 100;
	}

	endDateTime = new Date();
	elapsedMsec = endDateTime.getTime() - startDateTime.getTime();
	results.elapsedMsec = elapsedMsec;

	if (TRACE.on)
	{
		TRACE.writeLine("\n***** Results *****");
		TRACE.writeLine("accountTypeId = {0}", results.accountTypeId);
		TRACE.writeLine("accountTypeDescription = {0}", results.accountTypeDescription);
		TRACE.writeLine("totalCosts = {0}", formatDollar(results.totalCosts, true, true));
		TRACE.writeLine("suggestedContribution = {0}", formatDollar(results.suggestedContribution, true, true));
		TRACE.writeLine("employerMatchingContribution = {0}", formatDollar(results.employerMatchingContribution, true, true));
		TRACE.writeLine("federalIncomeTaxSavings = {0}", formatDollar(results.federalIncomeTaxSavings, true, true));
		TRACE.writeLine("ficaTaxSavings = {0}", formatDollar(results.ficaTaxSavings, true, true));
		TRACE.writeLine("totalTaxSavings = {0}", formatDollar(results.totalTaxSavings, true, true));
		TRACE.writeLine("totalMatchAndTaxSavings = {0}", formatDollar(results.totalMatchAndTaxSavings, true, true));
	}

	TRACE.writeLine("\n{0}.calculate() returning.  Elapsed time: {1} msec.", this.objName, elapsedMsec);

	return results;
};

this._defined = true;
};

FSAE_ENGINE._definition(); // invoke above definition function
