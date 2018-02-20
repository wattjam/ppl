//-------------------------------------------------------------------------------------------------
// mpceEngine.js
//
// Copyright (C) 2015 Mercer LLC, All Rights Reserved.
//
// Contains the MPCE calculation engine's methods.  See also mpceConfig.js for the configuration.
//
// IMPORTANT NOTE:  Generally, modification to the methods in the MPCE engine shouldn't be needed
//   unless the current version doesn't allow for some feature of a particular MPCE.  In that case,
//   the correct approach would be to extend the model by defining and adding new configuration
//   properties in mpceConfig.js, followed by corresponding logic to validate the new properties in
//   mpceValidation.js, and finally new logic to interpret the new properties in the engine logic
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
var MPCE_ENGINE = {};
MPCE_ENGINE._definition = function () { // IMPORTANT: Gets called at end of the file.
"use strict";
if (this._defined) { return; }

this.objName = "MPCE_ENGINE"; // For use in trace output
this.version = "1.0.25"; // Update for each published release of the engine.

this.makeLimitObjectCategoryToGroupMap = function (config, mapName, limitObjectName)
{
	///	<summary>
	///	Private (intended) helper method for maybeMarkupConfig().  Attaches a new map to
	/// each plan object which allows easy lookup of the person/family deductible/out-of-pocket
	/// group for a given category.
	///	</summary>
	/// <param name="config" type="Object">The MPCE configuration object.</param>
	/// <param name="mapName" type="String">The name of the map to create in each plan.</param>
	/// <param name="limitObjectName" type="String">The limit object the map will be based on.</param>
	///	<returns type="undefined"></returns>

	var i, j, k, planId, plan, categories, categoryId, group;

	for (i = 0; i < config.plansOrder.length; ++i)
	{
		planId = config.plansOrder[i];
		plan = config.plans[planId];
		plan[mapName] = {};

		if (plan[limitObjectName] !== undefined)
		{
			// First, map each group to the "general" category.
			for (j = 0; j < config.categoriesOrder.length; ++j)
			{
				categoryId = config.categoriesOrder[j];
				plan[mapName][categoryId] = "general";
			}

			// Then override for all custom groups defined in the limit object.
			for (group in plan[limitObjectName])
			{
				if (plan[limitObjectName].hasOwnProperty(group) && group !== "general")
				{
					categories = plan[limitObjectName][group].categories;
					for (k = 0; k < categories.length; ++k)
					{
						categoryId = categories[k];
						plan[mapName][categoryId] = group;
					}
				}
			}
		}
	}
};

this.maybeMarkupConfig = function (config)
{
	///	<summary>
	///	Private (intended) helper method for calculate() which performs additional markup on the
	/// MPCE configuration object.  The additional markup entails:
	///
	///   (1) adding a "categoryId" property to each service to quickly find the category a service is in,
	///   (2) wrap all single plan coverage objects in an array, so all plan coverage objects are arrays,
	///   (3) adding an "eligibleForFund" property to each plan coverage within the service, to quickly
	///       determine whether the fund amount (if any) can be used to offset copays, coinsurance, and
	///       deductibles for the service.
	///   (4) building two arrays which will determine the calculation order for a given plan: one
	///       containing services with deductibles, and one containing services with no deductibles.
	///   (5) adding to each plan a mapping from service category to deductible/out-of-pocket groups
	///
	///	</summary>
	/// <param name="config" type="Object">The MPCE configuration object.</param>
	///	<returns type="undefined"></returns>

	var i, j, k, categoryId, orderedContents, serviceId, service, planId, planCoverage, hasDeductible;

	if (config.isMarkedUpAlready)
	{
		// Config object is already marked up; nothing to do.
		return;
	}

	TRACE.writeLine("{0}.maybeMarkupConfig() performing config markup.", this.objName);

	// Initialization related to markup (4) above.
	config.servicesWithDeductibleOrderByPlan = {};
	config.servicesNoDeductibleOrderByPlan = {};
	for (i = 0; i < config.plansOrder.length; ++i)
	{
		planId = config.plansOrder[i];
		config.servicesWithDeductibleOrderByPlan[planId] = [];
		config.servicesNoDeductibleOrderByPlan[planId] = [];
	}

	// For each category...
	for (i = 0; i < config.categoriesOrder.length; ++i)
	{
		categoryId = config.categoriesOrder[i];
		orderedContents = config.categories[categoryId].orderedContents;

		// For each service within the category...
		for (j = 0; j < orderedContents.length; ++j)
		{
			serviceId = orderedContents[j];
			service = config.services[serviceId];

			// Markup (1) above.
			service.categoryId = categoryId;

			// Markup (2) above.
			for (planId in service.coverage)
			{
				if (service.coverage.hasOwnProperty(planId))
				{
					planCoverage = service.coverage[planId];
					if (!isArray(planCoverage))
					{
						service.coverage[planId] = [planCoverage];
					}
					// else, it's already an array...
				}
			}

			// Markups (3) and (4) above.
			for (planId in service.coverage)
			{
				if (service.coverage.hasOwnProperty(planId))
				{
					hasDeductible = false;
					planCoverage = service.coverage[planId]; // Note: Here, it must be an array, always.
					for (k = 0; k < planCoverage.length; ++k)
					{
						hasDeductible = hasDeductible || (planCoverage[k].deductible !== "none");
						if (planCoverage[k].eligibleForFund === undefined)
						{
							planCoverage[k].eligibleForFund =
								config.plans[planId].categoriesFundAppliesTo !== undefined ?
								(config.plans[planId].categoriesFundAppliesTo[categoryId] || false) : false;
						}
						// else, there was already an eligibleForFund defined explicitly; let it stand.
					}

					// For markup (4)
					if (hasDeductible)
					{
						config.servicesWithDeductibleOrderByPlan[planId].push(serviceId);
					}
					else
					{
						config.servicesNoDeductibleOrderByPlan[planId].push(serviceId);
					}
				}
			} // end for each planId in service.Coverage
		} // end for each serviceId within the category's orderedContents
	}

	// For markup (5)
	this.makeLimitObjectCategoryToGroupMap(config, "personDeductibleCategoryToGroup", "personDeductibles");
	this.makeLimitObjectCategoryToGroupMap(config, "personOutOfPocketCategoryToGroup", "personOutOfPocketMaximums");
	this.makeLimitObjectCategoryToGroupMap(config, "familyDeductibleCategoryToGroup", "familyDeductibles");
	this.makeLimitObjectCategoryToGroupMap(config, "familyOutOfPocketCategoryToGroup", "familyOutOfPocketMaximums");

	// Important: Mark the configuration as already marked up, so it isn't performed again on
	// subsequent calls to calculate().
	config.isMarkedUp = true;
};

this.determineCoverageLevel = function (config, spouse, childrenArray)
{
	///	<summary>
	///	Private (intended) helper method for calculate().  Given an object (or null)
	/// for the spouse, and an array for the children (perhaps containing zero objects), returns the
	/// appropriate coverage level based on which of the objects are defined or not.
	///	</summary>
	///	<param name="config" type="Object">The MPCE configuration object.</param>
	///	<param name="spouse" type="Object">A defined object if there is a spouse, or null/undefined
	///     otherwise.</param>
	///	<param name="childrenArray" type="Object">An array of children objects.</param>
	///	<returns type="String">The corresponding coverageLevelId from the config.coverageLevels object.</returns>

	var result, coverageLevelId, coverageLevel, i, hasSpouse, numChildren;

	TRACE.writeLine("{0}.determineCoverageLevel() called", this.objName);

	hasSpouse = !isNullOrUndefined(spouse);
	numChildren = childrenArray.length;

	TRACE.writeLine("hasSpouse = {0}, numChildren = {1}", hasSpouse, numChildren);

	result = null;
	for (i = 0; i < config.coverageLevelsOrder.length; ++i)
	{
		coverageLevelId = config.coverageLevelsOrder[i];
		coverageLevel = config.coverageLevels[coverageLevelId];
		// If there's a spouse and the current coverage level doesn't cover
		// the spouse, then skip it.
		if ((hasSpouse && !coverageLevel.spouse))
		{
			continue;
		}
		// Then, determine if the number of children covered is sufficient.  If so,
		// then we've located the appropriate coverage level and can exit the loop.
		if (coverageLevel.maxNumChildren >= numChildren)
		{
			result = coverageLevelId;
			break;
		}
	}
	if (null === result)
	{
		throw new Error(String.format(
			"Unable to locate suitable coverageLevel.  hasSpouse={0} and numChildren={1}.", hasSpouse, numChildren));
	}

	TRACE.writeLine("result = {0}", result);

	return result;
};

this.calculateDeductible = function (costLeft, singleUseCostMaxLeft,
	personAmounts, personDeductibleGroup, personOutOfPocketGroup,
	familyAmounts, familyDeductibleGroup, familyOutOfPocketGroup)
{
	///	<summary>
	///	Private (intended) helper method for calculateService() that calculates the
	/// deductible for a service (if any) and accumulates to corresponding person and family amounts.
	///	</summary>
	///	<param name="costLeft" type="Number">The amount of cost remaining for the service.</param>
	///	<param name="singleUseCostMaxLeft" type="Number">Serves to limit the overall cost for a single service.</param>
	///	<param name="personAmounts" type="Object">Object holding the person's deductible and OOP amounts.</param>
	///	<param name="personDeductibleGroup" type="String">The person deductible group for this service.</param>
	///	<param name="personOutOfPocketGroup" type="String">The person out of pocket group for this service.</param>
	///	<param name="familyAmounts" type="Object">Object holding the family's deductible and OOP amounts.</param>
	///	<param name="familyDeductibleGroup" type="String">The family deductible group for this service.</param>
	///	<param name="familyOutOfPocketGroup" type="String">The family out of pocket group for this service.</param>
	///	<returns type="Number">The deductible amount calculated.</returns>

	var deductible;

	// The deductible paid will be the smaller of the cost left, the per-person deductible
	// available, or the family deductible available.
	deductible = Math.min3(Math.min(costLeft, singleUseCostMaxLeft),
		personDeductibleGroup ? personAmounts.dedsAvailableByGroup[personDeductibleGroup] : Infinity,
		familyDeductibleGroup ? familyAmounts.dedsAvailableByGroup[familyDeductibleGroup] : Infinity);
	deductible = Math.round(deductible * 100) / 100; // to nearest cent.
	// Adjust the deductible amounts and out-of-pocket amounts used and available.
	personAmounts.totalDeductibles += deductible;
	if (personDeductibleGroup !== undefined)
	{
		personAmounts.dedsUsedByGroup[personDeductibleGroup] += deductible;
		personAmounts.dedsAvailableByGroup[personDeductibleGroup] -= deductible;
	}
	if (personOutOfPocketGroup !== undefined)
	{
		personAmounts.oopsUsedByGroup[personOutOfPocketGroup] += deductible;
		personAmounts.oopsAvailableByGroup[personOutOfPocketGroup] -= deductible;
	}
	if (familyDeductibleGroup !== undefined)
	{
		familyAmounts.dedsUsedByGroup[familyDeductibleGroup] += deductible;
		familyAmounts.dedsAvailableByGroup[familyDeductibleGroup] -= deductible;
	}
	if (familyOutOfPocketGroup !== undefined)
	{
		familyAmounts.oopsUsedByGroup[familyOutOfPocketGroup] += deductible;
		familyAmounts.oopsAvailableByGroup[familyOutOfPocketGroup] -= deductible;
	}
	return deductible;
};

this.calculateCopay = function (costLeft, singleUseCostMaxLeft, nominalCopay, copayNotTowardsOOPMax,
	personAmounts, personOutOfPocketGroup, familyAmounts, familyOutOfPocketGroup)
{
	///	<summary>
	///	Private (intended) helper method for calculateService() that calculates the
	/// copay for a service (if any) and accumulates to corresponding person and family amounts.
	///	</summary>
	///	<param name="costLeft" type="Number">The amount of cost remaining for the service.</param>
	///	<param name="singleUseCostMaxLeft" type="Number">Serves to limit the overall cost for a single service.</param>
	///	<param name="nominalCopay" type="Number">The nominal copay amount; i.e. the amount that normally would
	///    be paid irrespective of out of pocket maximums and the cost of the service.</param>
	///	<param name="copayNotTowardsOOPMax" type="Boolean">A boolean, true indicatnig that the copay does
	///    not count towards the out of pocket max, false otherwise.</param>
	///	<param name="personAmounts" type="Object">Object holding the person's deductible and OOP amounts.</param>
	///	<param name="personOutOfPocketGroup" type="String">The person out of pocket group for this service.</param>
	///	<param name="familyAmounts" type="Object">Object holding the family's deductible and OOP amounts.</param>
	///	<param name="familyOutOfPocketGroup" type="String">The family out of pocket group for this service.</param>
	///	<returns type="Number">The copay amount calculated.</returns>

	var copay;

	// Calculate the potential copay to be paid, irrespective of out-of-pocket maximums.
	copay = Math.min3(costLeft, nominalCopay, singleUseCostMaxLeft);
	if (!(copayNotTowardsOOPMax || false))
	{
		// Calculate the actual copay to be paid taking into account out-of-pocket maximums.
		copay = Math.min3(copay,
			personOutOfPocketGroup ? personAmounts.oopsAvailableByGroup[personOutOfPocketGroup] : Infinity,
			familyOutOfPocketGroup ? familyAmounts.oopsAvailableByGroup[familyOutOfPocketGroup] : Infinity);
	}
	copay = Math.round(copay * 100) / 100; // to nearest cent.
	if (!(copayNotTowardsOOPMax || false))
	{
		// Adjust the out-of-pocket amounts used and available.
		if (personOutOfPocketGroup !== undefined)
		{
			personAmounts.oopsUsedByGroup[personOutOfPocketGroup] += copay;
			personAmounts.oopsAvailableByGroup[personOutOfPocketGroup] -= copay;
		}
		if (familyOutOfPocketGroup !== undefined)
		{
			familyAmounts.oopsUsedByGroup[familyOutOfPocketGroup] += copay;
			familyAmounts.oopsAvailableByGroup[familyOutOfPocketGroup] -= copay;
		}
	}
	return copay;
};

this.calculateCoinsurance = function (costLeft, singleUseCostMaxLeft, nominalCoinsuranceRate,
	coinsuranceMinDollar, coinsuranceMaxDollar, coinsuranceNotTowardsOOPMax,
	personAmounts, personOutOfPocketGroup, familyAmounts, familyOutOfPocketGroup)
{
	///	<summary>
	///	Private (intended) helper method for calculateService() that calculates the
	/// coinsurance for a service (if any) and accumulates to corresponding person and family amounts.
	///	</summary>
	///	<param name="costLeft" type="Number">The amount of cost remaining for the service.</param>
	///	<param name="singleUseCostMaxLeft" type="Number">Serves to limit the overall cost for a single service.</param>
	///	<param name="nominalCoinsuranceRate" type="Number">The nominal coinsurance rate; i.e. the percentage
	///    of the costs left that normally would be paid irrespective of out of pocket maximums.</param>
	///	<param name="coinsuranceMinDollar" type="Number">The minimum dollar amount to enforce for the
	///    coinsurance, or undefined if not applicable.  Note: May increase the coinsurance above the nominal
	///    rate, but never more than the cost remaining.</param>
	///	<param name="coinsuranceMaxDollar" type="Number">The maximum dollar amuont to enforce for the
	///    coinsurance, or undefined if not applicable.</param>
	///	<param name="coinsuranceNotTowardsOOPMax" type="Boolean">A boolean, true indicatnig that the coinsurance
	///    does not count towards the out of pocket max, false otherwise.</param>
	///	<param name="personAmounts" type="Object">Object holding the person's deductible and OOP amounts.</param>
	///	<param name="personOutOfPocketGroup" type="String">The person out of pocket group for this service.</param>
	///	<param name="familyAmounts" type="Object">Object holding the family's deductible and OOP amounts.</param>
	///	<param name="familyOutOfPocketGroup" type="String">The family out of pocket group for this service.</param>
	///	<returns type="Number">The copay amount calculated.</returns>

	var coinsurance;

	// Calculate the potential coinsurance to be paid, irrespective of out-of-pocket maximums.
	coinsurance = costLeft * nominalCoinsuranceRate;
	// Adjust for any potential min or max dollar amounts
	coinsurance = Math.max(coinsurance, coinsuranceMinDollar || -Infinity);
	coinsurance = Math.min(coinsurance, coinsuranceMaxDollar || Infinity);
	coinsurance = Math.min3(coinsurance, costLeft, singleUseCostMaxLeft);
	if (!(coinsuranceNotTowardsOOPMax || false))
	{
		// Calculate the actual coinsurance to be paid, taking into account out-of-pocket maximums.
		coinsurance = Math.min3(coinsurance,
			personOutOfPocketGroup ? personAmounts.oopsAvailableByGroup[personOutOfPocketGroup] : Infinity,
			familyOutOfPocketGroup ? familyAmounts.oopsAvailableByGroup[familyOutOfPocketGroup] : Infinity);
	}
	coinsurance = Math.round(coinsurance * 100) / 100; // nearest cent
	if (!(coinsuranceNotTowardsOOPMax || false))
	{
		// Adjust the out-of-pocket amounts used and available.
		if (personOutOfPocketGroup !== undefined)
		{
			personAmounts.oopsUsedByGroup[personOutOfPocketGroup] += coinsurance;
			personAmounts.oopsAvailableByGroup[personOutOfPocketGroup] -= coinsurance;
		}
		if (familyOutOfPocketGroup !== undefined)
		{
			familyAmounts.oopsUsedByGroup[familyOutOfPocketGroup] += coinsurance;
			familyAmounts.oopsAvailableByGroup[familyOutOfPocketGroup] -= coinsurance;
		}
	}
	return coinsurance;
};

this.calculateService = function (config, planId, service, personAmounts, familyAmounts)
{
	///	<summary>
	///	Private (intended) helper method for calculateSinglePlan() that calculates
	/// deductibles, copays, and coinsurance for a single service.  Note that, while a service is
	/// typically EITHER copay-based or coinsurance-based, in some exceptional cases there could be
	/// both a copay and a coinsurance amount... this method handles all cases.
	///	</summary>
	///	<param name="config" type="Object">The MPCE configuration object.</param>
	///	<param name="planId" type="Object">The id for the plan under which the service is being calculated.</param>
	///	<param name="service" type="object">Object container for service-specific in and out parameters.
	///     See the definition of this object in calculateSinglePlan().</param>
	///	<param name="personAmounts" type="object">Object container for person amounts in and out parameters.
	///     See the definition of this object in calculateSinglePlan().</param>
	///	<param name="familyAmounts" type="object">Object container for family amounts in and out parameters.
	///     See the definition of this object in calculateSinglePlan().</param>
	///	<returns type="undefined"></returns>

	var coveredCount, notCoveredCount, personDeductibleGroup, personOutOfPocketGroup, familyDeductibleGroup, familyOutOfPocketGroup,
		costLeft, deductible, copay, coinsurance, reimbursed, coveredCountLeft, partial, singleUseCostMaxLeft, combinedLimitId,
		combinedLimitAvailable, personCombinedLimitAvailable, familyCombinedLimitAvailable;

	// Special case: If the service id starts with "additionalServices" and has a cost of 1 dollar, then the count
	// is meant to represent a dollar amount of additional medical services, and not a count for a specific service.
	// So, set the cost to be the count and the count to be 1 to optimize the loop below for this special case.
	if (service.id.match(/^additionalServices/) && service.cost === 1.0)
	{
		service.cost = service.count;
		service.count = 1;
	}

	combinedLimitAvailable = Infinity;
	if( service.coverage.combinedLimitId !== undefined )
	{
		combinedLimitId = service.coverage.combinedLimitId;
		personCombinedLimitAvailable = (personAmounts.combinedLimitsAvailable[combinedLimitId] !== undefined) ?
			personAmounts.combinedLimitsAvailable[combinedLimitId] : Infinity;
		familyCombinedLimitAvailable = (familyAmounts.combinedLimitsAvailable[combinedLimitId] !== undefined) ?
			familyAmounts.combinedLimitsAvailable[combinedLimitId] : Infinity;
		combinedLimitAvailable = Math.min(personCombinedLimitAvailable, familyCombinedLimitAvailable);
	}

	// Determine how many and how much of the services are covered.  First, if notCovered is true, then
	// none of the services are covered.  Otherwise, if there is no coveredCount defined on the serviceCoverage
	// object, then all of the services will be covered.  Otherwise, some may be covered, and some may not.
	if (service.coverage.notCovered || false)
	{
		coveredCount = 0;
		notCoveredCount = service.count;
	}
	else
	{
		if (service.coverage.coveredCount !== undefined)
		{
			coveredCount = Math.min(service.count, service.coverage.coveredCount);
		}
		else if (service.coverage.dollarLimit !== undefined)
		{
			service.coverage.coveredCountFromDollarLimit = service.coverage.dollarLimit / service.cost;
			coveredCount = Math.min(service.count, service.coverage.coveredCountFromDollarLimit);
		}
		else
		{
			coveredCount = service.count;
		}
		notCoveredCount = service.count - coveredCount;
	}

	service.deductibles = 0;
	service.copays = 0;
	service.coinsurance = 0;
	service.reimbursed = 0;
	service.expensesNotCovered = 0;
	service.combinedLimitAttained = false;

	personDeductibleGroup = config.plans[planId].personDeductibleCategoryToGroup[service.categoryId];
	personOutOfPocketGroup = config.plans[planId].personOutOfPocketCategoryToGroup[service.categoryId];
	familyDeductibleGroup = config.plans[planId].familyDeductibleCategoryToGroup[service.categoryId];
	familyOutOfPocketGroup = config.plans[planId].familyOutOfPocketCategoryToGroup[service.categoryId];

	coveredCountLeft = coveredCount;

	while ((coveredCountLeft > 0) && (combinedLimitAvailable > 0))
	{
		deductible = 0;
		copay = 0;
		coinsurance = 0;

		partial = (coveredCountLeft > 1) ? 1 : coveredCountLeft;
		coveredCountLeft -= partial;

		// costLeft is our starting point for further application of deductible, copay, and coinsurance.
		costLeft = service.cost * partial;
		singleUseCostMaxLeft = service.coverage.singleUseCostMax || Infinity;

		//--------------------------------------------------------------
		// DEDUCTIBLE, IF CALCULATED BEFORE COPAYS

		if (service.coverage.deductible === "beforeCopay")
		{
			deductible = this.calculateDeductible(costLeft, singleUseCostMaxLeft,
				personAmounts, personDeductibleGroup, personOutOfPocketGroup,
				familyAmounts, familyDeductibleGroup, familyOutOfPocketGroup);
			costLeft -= deductible;
			singleUseCostMaxLeft -= deductible;
		}

		//--------------------------------------------------------------
		// COPAYS

		if (service.coverage.copay !== undefined)
		{
			// Calculate the potential copay to be paid, irrespective of out-of-pocket maximums.
			copay = this.calculateCopay(costLeft, singleUseCostMaxLeft,
				service.coverage.copay, service.coverage.copayNotTowardsOOPMax,
				personAmounts, personOutOfPocketGroup, familyAmounts, familyOutOfPocketGroup);
			costLeft -= copay;
			singleUseCostMaxLeft -= copay;
		}

		//--------------------------------------------------------------
		// DEDUCTIBLE, IF CALCULATED AFTER COPAYS / BEFORE COINSURANCE

		if (service.coverage.deductible === undefined ||
			service.coverage.deductible === "afterCopay" ||
			service.coverage.deductible === "beforeCoinsurance")
		{
			deductible = this.calculateDeductible(costLeft, singleUseCostMaxLeft,
				personAmounts, personDeductibleGroup, personOutOfPocketGroup,
				familyAmounts, familyDeductibleGroup, familyOutOfPocketGroup);
			costLeft -= deductible;
			singleUseCostMaxLeft -= deductible;
		}

		//--------------------------------------------------
		// COINSURANCE

		if (service.coverage.coinsurance !== undefined)
		{
			coinsurance = this.calculateCoinsurance(costLeft, singleUseCostMaxLeft,
				service.coverage.coinsurance, service.coverage.coinsuranceMinDollar,
				service.coverage.coinsuranceMaxDollar, service.coverage.coinsuranceNotTowardsOOPMax,
				personAmounts, personOutOfPocketGroup, familyAmounts, familyOutOfPocketGroup);
			costLeft -= coinsurance;
			singleUseCostMaxLeft -= coinsurance;
		}

		reimbursed = Math.min(combinedLimitAvailable, costLeft);
		combinedLimitAvailable -= reimbursed;
		costLeft -= reimbursed;
		service.deductibles += deductible;
		service.copays += copay;
		service.coinsurance += coinsurance;
		service.reimbursed += reimbursed;
		service.expensesNotCovered += costLeft;

	} // end while (coveredCountLeft > 0) && (combinedLimitAvailable > 0)

	if( combinedLimitId !== undefined )
	{
		if( personAmounts.combinedLimitsUsed[combinedLimitId] !== undefined )
		{
			personAmounts.combinedLimitsUsed[combinedLimitId] += service.reimbursed;
			personAmounts.combinedLimitsAvailable[combinedLimitId] -= service.reimbursed;
		}
		if( familyAmounts.combinedLimitsUsed[combinedLimitId] !== undefined )
		{
			familyAmounts.combinedLimitsUsed[combinedLimitId] += service.reimbursed;
			familyAmounts.combinedLimitsAvailable[combinedLimitId] -= service.reimbursed;
		}
	}
	service.combinedLimitAttained = !(combinedLimitAvailable > 0);
	notCoveredCount += coveredCountLeft; // n.b. may be > 0 if loop exited due to combined limit reached
	service.expensesNotCovered += (notCoveredCount * service.cost);

	if (TRACE.on)
	{
		TRACE.writeLine("{0}:{1} @{2} cov:{3} not:{4} ({5}) ded:{6} cop:{7} coi:{8} re:{9} {10}",
			String.padLeft(service.categoryId + "/" + service.id, 44),
			String.padLeft(service.count, 3),
			String.padLeft(formatDollar(service.cost, true, true), 8),
			String.padLeft(coveredCount, 3),
			String.padLeft(notCoveredCount, 3),
			String.padLeft(formatDollar(service.expensesNotCovered, true, true), 7),
			String.padLeft(formatDollar(service.deductibles, true, true), 7),
			String.padLeft(formatDollar(service.copays, true, true), 7),
			String.padLeft(formatDollar(service.coinsurance, true, true), 7),
			String.padLeft(formatDollar(service.reimbursed, true, true), 7),
			service.combinedLimitAttained ? " @ MAX COMBINED LIMIT" : "");
	}
};

this.calculateSinglePlan = function (config, planId, regionId, statusId, coverageLevelId, peopleServices,
	fundRolloverAmount, voluntaryFundContributionAmount, premiumAdjustmentAmount, planFundAdditionalMatchAmount)
{
	///	<summary>
	///	Private (intended) helper method for calculate() which performs the calculation
	/// for the specified planId.
	///	</summary>
	///	<param name="config" type="Object">The MPCE configuration object.</param>
	///	<param name="planId" type="String">The planId for the calculation.</param>
	///	<param name="regionId" type="String">The regionId for the calculation.</param>
	///	<param name="statusId" type="String">The employee statusId for the calculation.</param>
	///	<param name="coverageLevelId" type="String">The employee coverageLevelId for the calculation.</param>
	///	<param name="peopleServices" type="Array">An array of objects.  Each object contains a map of service
	///     ids to counts for a person.  If a given service id is not mentioned, it's assumed to be zero.</param>
	///	<param name="fundRolloverAmount" type="Number">The fund rollover amount (from a prior year.)</param>
	///	<param name="voluntaryFundContributionAmount" type="Number">The voluntary fund contribution amount
	///     (for the current year.)</param>
	///	<param name="premiumAdjustmentAmount" type="Number">An amount that adjusts the configured plan premium.</param>
	///	<param name="planFundAdditionalMatchAmount" type="Number">An additional plan fund matching amount.  This
	///     would be determined outside the engine by custom logic, if the plan allows for a match on voluntary
	///     contributions, for instance.</param>
	///	<returns type="Object">An object containing the calculation results for the plan.  The result
	///     object contains the planId to which it corresponds, as well as the various result values,
	///     which are currently numbers representing dollar amounts.
	/// </returns>

	var result, i, j, k, group, planFundAmount, totalFundAmountAvailable, service, peopleAmounts, familyAmounts,
		personAmounts, personServices, combinedLimitId, serviceId, costsObjectId, serviceCoverageArray,
		calculateServicesInnerFunc, resultsToRound;

	TRACE.writeLine("\n*** calculateSinglePlan() called for planId {0}", planId);

	result =
	{
		planId: planId,
		planName: descriptionHelper(config.plans[planId]),
		coverageLevelId: coverageLevelId,
		coverageLevelDescription: descriptionHelper(config.coverageLevels[coverageLevelId]),
		totalDeductibles: 0,
		totalCopays: 0,
		totalCoinsurance: 0,
		totalExpensesNotCovered: 0,
		totalRawExpenses: 0,
		totalFundEligibleCosts: 0,
		totalFundAmountOffset: 0,
		planFundPaid: 0,
		planFundAdditionalMatchPaid: 0,
		planRolloverFundPaid: 0,
		voluntaryFundPaid: 0,
		fundCarryoverBalance: 0,
		totalMedicalAndDrugCostsExcludingDeductibles: 0,
		totalMedicalAndDrugCosts: 0,
		totalMedicalAndDrugCostsLessFundOffset: 0,
		totalEmployerOrPlanPaidExcludingFund: 0,
		totalAnnualPayrollContributionsExcludingAdjustment: 0,
		totalAnnualPayrollContributions: 0,
		totalCareAndPayrollContributions: 0,
		totalCurrentYearFundContributions: 0,
		totalAnnualCost: 0
	};

	// Container for service-specific in/out parameters for calculateService().
	service =
	{
		id: "",
		count: 0,
		cost: 0,
		coverage: null,
		deductibles: 0,
		copays: 0,
		coinsurance: 0,
		reimbursed: 0,
		expensesNotCovered: 0,
		combinedLimitAttained: false
	};

	// Container for family-specific in/out parameters for calculateService().
	familyAmounts = {};
	familyAmounts.dedsUsedByGroup = {};
	familyAmounts.dedsAvailableByGroup = {};
	familyAmounts.oopsUsedByGroup = {};
	familyAmounts.oopsAvailableByGroup = {};
	familyAmounts.combinedLimitsUsed = {};
	familyAmounts.combinedLimitsAvailable = {};

	// If the plan configuration specifies a familyDeductibles object, for each group, look inside for
	// either an amountMap (keyed on coverageLevelId, or regionId then coverageLevelId) or an amount.
	// If neither, default to infinity.
	if (config.plans[planId].familyDeductibles !== undefined)
	{
		for (group in config.plans[planId].familyDeductibles)
		{
			if (config.plans[planId].familyDeductibles.hasOwnProperty(group))
			{
				familyAmounts.dedsUsedByGroup[group] = 0;
				if (config.plans[planId].familyDeductibles[group].amountMap !== undefined)
				{
					// There may or may not be a regionId level or statusId level in the amountMap.
					familyAmounts.dedsAvailableByGroup[group] =
						(config.plans[planId].familyDeductibles[group].amountMap[regionId] !== undefined) ?
							config.plans[planId].familyDeductibles[group].amountMap[regionId][coverageLevelId] :
							((config.plans[planId].familyDeductibles[group].amountMap[statusId] !== undefined) ?
								config.plans[planId].familyDeductibles[group].amountMap[statusId][coverageLevelId] :
								config.plans[planId].familyDeductibles[group].amountMap[coverageLevelId]);
				}
				else
				{
					familyAmounts.dedsAvailableByGroup[group] = config.plans[planId].familyDeductibles[group].amount;
				}
			}
		}
	}
	// If the plan configuration specifies a familyOutOfPocketMaximums object, for each group, look inside
	// for either an amountMap (keyed on coverageLevelId, or regionId then coverageLevelId) or an amount.
	// If neither, default to infinity.
	if (config.plans[planId].familyOutOfPocketMaximums !== undefined)
	{
		for (group in config.plans[planId].familyOutOfPocketMaximums)
		{
			if (config.plans[planId].familyOutOfPocketMaximums.hasOwnProperty(group))
			{
				familyAmounts.oopsUsedByGroup[group] = 0;
				if (config.plans[planId].familyOutOfPocketMaximums[group].amountMap !== undefined)
				{
					// There may or may not be a regionId level or statusId level in the amountMap.
					familyAmounts.oopsAvailableByGroup[group] =
						(config.plans[planId].familyOutOfPocketMaximums[group].amountMap[regionId] !== undefined) ?
							config.plans[planId].familyOutOfPocketMaximums[group].amountMap[regionId][coverageLevelId] :
							((config.plans[planId].familyOutOfPocketMaximums[group].amountMap[statusId] !== undefined) ?
								config.plans[planId].familyOutOfPocketMaximums[group].amountMap[statusId][coverageLevelId] :
								config.plans[planId].familyOutOfPocketMaximums[group].amountMap[coverageLevelId]);
				}
				else
				{
					familyAmounts.oopsAvailableByGroup[group] = config.plans[planId].familyOutOfPocketMaximums[group].amount;
				}
			}
		}
	}

	// Set up family combined limits, if any.
	if( config.combinedLimits !== undefined )
	{
		for (combinedLimitId in config.combinedLimits)
		{
			if (config.combinedLimits.hasOwnProperty(combinedLimitId) &&
				config.combinedLimits[combinedLimitId].familyReimburseLimit !== undefined)
			{
				familyAmounts.combinedLimitsUsed[combinedLimitId] = 0;
				familyAmounts.combinedLimitsAvailable[combinedLimitId] = config.combinedLimits[combinedLimitId].familyReimburseLimit;
			}
		}
	}

	// Containers for person-specific in/out parameters for calculateService().
	peopleAmounts = [];
	for (i = 0; i < peopleServices.length; ++i)
	{
		personAmounts = {};
		personAmounts.index = i;
		personAmounts.totalDeductibles = 0;
		personAmounts.dedsUsedByGroup = {};
		personAmounts.dedsAvailableByGroup = {};
		personAmounts.oopsUsedByGroup = {};
		personAmounts.oopsAvailableByGroup = {};
		personAmounts.combinedLimitsUsed = {};
		personAmounts.combinedLimitsAvailable = {};
		if (config.plans[planId].personDeductibles !== undefined)
		{
			for (group in config.plans[planId].personDeductibles)
			{
				if (config.plans[planId].personDeductibles.hasOwnProperty(group))
				{
					personAmounts.dedsUsedByGroup[group] = 0;
					if (config.plans[planId].personDeductibles[group].amountMap !== undefined)
					{
						// There may or may not be a regionId or statusId level in the amountMap.
						personAmounts.dedsAvailableByGroup[group] =
							(config.plans[planId].personDeductibles[group].amountMap[regionId] !== undefined) ?
								config.plans[planId].personDeductibles[group].amountMap[regionId][coverageLevelId] :
								((config.plans[planId].personDeductibles[group].amountMap[statusId] !== undefined) ?
									config.plans[planId].personDeductibles[group].amountMap[statusId][coverageLevelId] :
									config.plans[planId].personDeductibles[group].amountMap[coverageLevelId]);
					}
					else
					{
						personAmounts.dedsAvailableByGroup[group] = config.plans[planId].personDeductibles[group].amount;
					}
				}
			}
		}
		if (config.plans[planId].personOutOfPocketMaximums !== undefined)
		{
			for (group in config.plans[planId].personOutOfPocketMaximums)
			{
				if (config.plans[planId].personOutOfPocketMaximums.hasOwnProperty(group))
				{
					personAmounts.oopsUsedByGroup[group] = 0;
					if (config.plans[planId].personOutOfPocketMaximums[group].amountMap !== undefined)
					{
						if (config.plans[planId].personOutOfPocketMaximums[group].amountMap[regionId] === undefined)
						{
							// There may or may not be a regionId or statusId level in the amountMap.
							personAmounts.oopsAvailableByGroup[group] =
								(config.plans[planId].personOutOfPocketMaximums[group].amountMap[regionId] !== undefined) ?
									config.plans[planId].personOutOfPocketMaximums[group].amountMap[regionId][coverageLevelId] :
									((config.plans[planId].personOutOfPocketMaximums[group].amountMap[statusId] !== undefined) ?
										config.plans[planId].personOutOfPocketMaximums[group].amountMap[statusId][coverageLevelId] :
										config.plans[planId].personOutOfPocketMaximums[group].amountMap[coverageLevelId]);
						}
					}
					else
					{
						personAmounts.oopsAvailableByGroup[group] = config.plans[planId].personOutOfPocketMaximums[group].amount;
					}
				}
			}
		}
		if( config.combinedLimits !== undefined )
		{
			for (combinedLimitId in config.combinedLimits)
			{
				if (config.combinedLimits.hasOwnProperty(combinedLimitId) &&
					config.combinedLimits[combinedLimitId].personReimburseLimit !== undefined)
				{
					personAmounts.combinedLimitsUsed[combinedLimitId] = 0;
					personAmounts.combinedLimitsAvailable[combinedLimitId] = config.combinedLimits[combinedLimitId].personReimburseLimit;
				}
			}
		}

		peopleAmounts.push(personAmounts);
	}

	// We need to perform the logic here twice; once for services in the plan that have
	// a deductible and then for services in the plan that have no deductible.  We define
	// this inner helper function here so it can access enclosing scoped variables.
	calculateServicesInnerFunc = function (that, SERVICES_ORDER_ARRAY)
	{
		for (i = 0; i < peopleServices.length; ++i)
		{
			TRACE.writeLine(" ===> processing peopleServices[{0}]", i);
			personServices = peopleServices[i];
			personAmounts = peopleAmounts[i];
			for (j = 0; j < SERVICES_ORDER_ARRAY.length; ++j)
			{
				serviceId = SERVICES_ORDER_ARRAY[j];
				if (personServices[serviceId] === undefined)
				{
					continue;
				}
				service.categoryId = config.services[serviceId].categoryId;
				service.id = serviceId;
				service.count = personServices[serviceId];
				costsObjectId = config.plans[planId].costsObjectId || "costs";
				service.cost = config.services[serviceId][costsObjectId][regionId];
				result.totalRawExpenses += (service.count * service.cost); // expenses irrespective of insurance

				// Now iterate through the coverage objects for the service and calculate the expenses after
				// insurance.  Note: maybeMarkupConfig() has ensured everything in coverage is in an array so
				// we can treat them consistently and not have arrays as an exception case.
				serviceCoverageArray = config.services[serviceId].coverage[planId];
				for (k = 0; k < serviceCoverageArray.length; ++k)
				{
					service.coverage = serviceCoverageArray[k];
					that.calculateService(config, planId, service, personAmounts, familyAmounts);

					if (service.coverage.coveredCount !== undefined)
					{
						// Reduce the visit count for the next coverage object.
						service.count = Math.max(0, service.count - service.coverage.coveredCount);
					}
					else if (service.coverage.coveredCountFromDollarLimit !== undefined)
					{
						// Reduce the visit count for the next coverage object.
						service.count = Math.max(0, service.count - service.coverage.coveredCountFromDollarLimit);
					}

					// Accumulate the per-service results into the overall results for the plan.
					result.totalCopays += service.copays;
					result.totalCoinsurance += service.coinsurance;
					result.totalFundEligibleCosts += service.coverage.eligibleForFund ?
						(service.deductibles + service.copays + service.coinsurance) : 0;

					// Special case: We don't process any coverage objects in the array that may follow a
					// coverage object referencing a combined limit once such limit has been attained.
					if( service.combinedLimitAttained )
					{
						break;
					}

					// Note: We don't accumulate expensesNotCovered for each coverage object, only
					// for the last one, which is why it is below outside of the loop.

				} // end for each object on the service coverage array

				result.totalFundEligibleCosts += service.coverage.eligibleForFund ? service.expensesNotCovered : 0;
				result.totalExpensesNotCovered += service.expensesNotCovered;

			}
		} // end for each personService in peopleServices
	}; // end inner helper function()

	TRACE.writeLine(" ===> First pass: For services with deductible:");
	calculateServicesInnerFunc(this, config.servicesWithDeductibleOrderByPlan[planId]);
	TRACE.writeLine(" ===> Second pass: For services with NO deductible:");
	calculateServicesInnerFunc(this, config.servicesNoDeductibleOrderByPlan[planId]);

	// Accumulate each person's total deductibles paid into the overall results for the plan.
	for (i = 0; i < peopleAmounts.length; ++i)
	{
		result.totalDeductibles += peopleAmounts[i].totalDeductibles;
	}

	// For planFundAmount, consult fundAmountMap keyed on coverage level (or region first) if present,
	// or zero if undefined.
	if (config.plans[planId].fundAmountMap !== undefined)
	{
		// There may or may not be a regionId or statusId level in the amountMap.
		planFundAmount =
			(config.plans[planId].fundAmountMap[regionId] !== undefined) ?
				config.plans[planId].fundAmountMap[regionId][coverageLevelId] :
				((config.plans[planId].fundAmountMap[statusId] !== undefined) ?
					config.plans[planId].fundAmountMap[statusId][coverageLevelId] :
					config.plans[planId].fundAmountMap[coverageLevelId]);
	}
	else
	{
		planFundAmount = 0;
	}

	// The total fund amount available is the amount for the plan, plus any plan fund additional match amount
	// that was passed in, plus the rollover amount, plus any voluntary contributions.
	totalFundAmountAvailable = planFundAmount + planFundAdditionalMatchAmount + fundRolloverAmount +
		voluntaryFundContributionAmount;

	// The amount of that fund actually used to offset costs is to be no more than the fund eligible costs.
	result.totalFundAmountOffset = Math.min(result.totalFundEligibleCosts, totalFundAmountAvailable);

	// Plan funds are considered to be used first, then plan additional match funds, then rollover funds,
	// then voluntary current year contributions.

	result.planFundPaid = Math.min(result.totalFundAmountOffset, planFundAmount);

	result.planFundAdditionalMatchPaid = Math.min(
		result.totalFundAmountOffset - result.planFundPaid, planFundAdditionalMatchAmount);

	result.rolloverFundPaid = Math.min(
		result.totalFundAmountOffset - (result.planFundPaid + result.planFundAdditionalMatchPaid),
		fundRolloverAmount);

	result.voluntaryFundPaid = result.totalFundAmountOffset -
		(result.planFundPaid + result.planFundAdditionalMatchPaid + result.rolloverFundPaid);

	result.fundCarryoverBalance = totalFundAmountAvailable - result.totalFundAmountOffset;

	result.totalMedicalAndDrugCostsExcludingDeductibles =
		result.totalCopays + result.totalCoinsurance + result.totalExpensesNotCovered;

	result.totalMedicalAndDrugCosts =
		result.totalDeductibles + result.totalCopays + result.totalCoinsurance +
		result.totalExpensesNotCovered;

	result.totalMedicalAndDrugCostsLessFundOffset = result.totalMedicalAndDrugCosts - result.totalFundAmountOffset;

	// Employer or plan (insurance) covered costs, excluding what any plan fund has paid.
	result.totalEmployerOrPlanPaidExcludingFund = result.totalRawExpenses - result.totalMedicalAndDrugCosts;

	// Determine annual payroll contributions.  Note: config.coverageLevelCostsPerPlan may or may not
	// have a level for regionId.  First, try to find the regionId.  If it isn't defined, then just try
	// to find it based on statusId.
	if (config.coverageLevelCostsPerPlan[planId][regionId] !== undefined)
	{
		result.totalAnnualPayrollContributionsExcludingAdjustment =
			(config.coverageLevelCostsPerPlan[planId][regionId][coverageLevelId][statusId] || 0);
	}
	else
	{
		result.totalAnnualPayrollContributionsExcludingAdjustment =
			(config.coverageLevelCostsPerPlan[planId][coverageLevelId][statusId] || 0);
	}
	result.totalAnnualPayrollContributions = Math.max(0,
		result.totalAnnualPayrollContributionsExcludingAdjustment + premiumAdjustmentAmount); // prevent negative

	result.totalCareAndPayrollContributions =
		result.totalMedicalAndDrugCostsLessFundOffset + result.totalAnnualPayrollContributions;

	result.totalCurrentYearFundContributions = voluntaryFundContributionAmount;

	result.totalAnnualCost =
		result.totalCareAndPayrollContributions + result.totalCurrentYearFundContributions;

	// Round all of these dollar amount results to the nearest penny.
	resultsToRound = [
		"totalCopays",
		"totalCoinsurance",
		"totalExpensesNotCovered",
		"totalRawExpenses",
		"totalFundEligibleCosts",
		"totalFundAmountOffset",
		"planFundPaid",
		"planFundAdditionalMatchPaid",
		"planRolloverFundPaid",
		"voluntaryFundPaid",
		"fundCarryoverBalance",
		"totalMedicalAndDrugCostsExcludingDeductibles",
		"totalMedicalAndDrugCosts",
		"totalMedicalAndDrugCostsLessFundOffset",
		"totalEmployerOrPlanPaidExcludingFund",
		"totalAnnualPayrollContributionsExcludingAdjustment",
		"totalAnnualPayrollContributions",
		"totalCareAndPayrollContributions",
		"totalCurrentYearFundContributions",
		"totalAnnualCost"
	];
	for (i = 0; i < resultsToRound.length; ++i)
	{
		result[resultsToRound[i]] = Math.round(result[resultsToRound[i]] * 100) / 100;
	}

	// Trace out the results for debugging purposes.
	if (TRACE.on)
	{
		TRACE.writeLine("\n***** Results for planId = {0} *****", result.planId);
		TRACE.writeLine("coverageLevelId = {0}", result.coverageLevelId);
		TRACE.writeLine("coverageLevelDescription = {0}", result.coverageLevelDescription);
		TRACE.writeLine("totalDeductibles = {0}", formatDollar(result.totalDeductibles, true, true));
		TRACE.writeLine("totalCopays = {0}", formatDollar(result.totalCopays, true, true));
		TRACE.writeLine("totalCoinsurance = {0}", formatDollar(result.totalCoinsurance, true, true));
		TRACE.writeLine("totalExpensesNotCovered = {0}", formatDollar(result.totalExpensesNotCovered, true, true));
		TRACE.writeLine("totalRawExpenses = {0}", formatDollar(result.totalRawExpenses, true, true));
		TRACE.writeLine("totalFundEligibleCosts = {0}", formatDollar(result.totalFundEligibleCosts, true, true));
		TRACE.writeLine("totalFundAmountOffset = {0}", formatDollar(result.totalFundAmountOffset, true, true));
		TRACE.writeLine("planFundPaid = {0}", formatDollar(result.planFundPaid, true, true));
		TRACE.writeLine("planFundAdditionalMatchPaid = {0}", formatDollar(result.planFundAdditionalMatchPaid, true, true));
		TRACE.writeLine("rolloverFundPaid = {0}", formatDollar(result.rolloverFundPaid, true, true));
		TRACE.writeLine("voluntaryFundPaid = {0}", formatDollar(result.voluntaryFundPaid, true, true));
		TRACE.writeLine("fundCarryoverBalance = {0}", formatDollar(result.fundCarryoverBalance, true, true));
		TRACE.writeLine("totalMedicalAndDrugCostsExcludingDeductibles = {0}", formatDollar(result.totalMedicalAndDrugCostsExcludingDeductibles, true, true));
		TRACE.writeLine("totalMedicalAndDrugCosts = {0}", formatDollar(result.totalMedicalAndDrugCosts, true, true));
		TRACE.writeLine("totalMedicalAndDrugCostsLessFundOffset = {0}", formatDollar(result.totalMedicalAndDrugCostsLessFundOffset, true, true));
		TRACE.writeLine("totalEmployerOrPlanPaidExcludingFund = {0}", formatDollar(result.totalEmployerOrPlanPaidExcludingFund, true, true));
		TRACE.writeLine("totalAnnualPayrollContributionsExcludingAdjustment = {0}", formatDollar(result.totalAnnualPayrollContributionsExcludingAdjustment, true, true));
		TRACE.writeLine("totalAnnualPayrollContributions = {0}", formatDollar(result.totalAnnualPayrollContributions, true, true));
		TRACE.writeLine("totalCareAndPayrollContributions = {0}", formatDollar(result.totalCareAndPayrollContributions, true, true));
		TRACE.writeLine("totalCurrentYearFundContributions = {0}", formatDollar(result.totalCurrentYearFundContributions, true, true));
		TRACE.writeLine("totalAnnualCost = {0}", formatDollar(result.totalAnnualCost, true, true));
	}

	return result;
};

this.calculate = function (config, regionId, statusId, primary, spouse, childrenArray,
	fundRolloverAmounts, voluntaryFundContributionAmounts, premiumAdjustmentAmounts, planFundAdditionalMatchAmounts)
{
	///	<summary>
	///	This is the main method to perform the MPCE (Medical Plan Cost Estimator) calculations.
	///	</summary>
	///	<param name="config" type="Object">The MPCE configuration object.</param>
	///	<param name="regionId" type="String">The region id to use for the calculation.</param>
	///	<param name="statusId" type="String">The employee status id to use for the calculation.</param>
	///	<param name="primary" type="Object">A required object mapping the primary's (employee's) service ids
	///     to counts.  Only services that have a non-zero count need be mentioned in the object.</param>
	///	<param name="spouse" type="Object">An optional object mapping the spouse's service ids to counts.
	///     Note that if null or undefined is passed, then the calculation assumes there is no spouse, and
	///     selects a coverage level accordingly.</param>
	///	<param name="childrenArray" type="Object">A required array of objects each representing a child.
	///     Each contained object should map child N's service ids to counts.</param>
	///	<param name="fundRolloverAmounts" type="Object">An optional object mapping plan names to prior year
	///     fund rollover amounts.  If null or undefined is passed, or if a particular plan isn't mentioned,
	///     then the calculation assumes no fund rollover amount for the corresponding plan(s).</param>
	///	<param name="voluntaryFundContributionAmountss" type="Object">An optional object mapping plan names to
	///     current year planned voluntary fund contribution amounts, for those plans that permit HSA contributions.
	///     If null or undefined is passed, or if a particular plan isn't mentioned, then the calculation assumes no
	///     fund contribution amount for the corresponding plan(s).</param>
	///	<param name="premiumAdjustmentAmounts" type="Object">An optional object mapping plan names to current
	///     year premium amount adjustments.  If null or undefined is passed, or if a particular plan isn't
	///     mentioned, then the calculation uses configured costs as-is.  If a particular plan has a value
	///     specified in this object, then it is added (or subtracted, if negative) to any configured costs.</param>
	///	<param name="planFundAdditionalMatchAmounts" type="Object">An optional object mapping plan names to
	///     plan fund additional match amounts. Such amounts, if necessary, would be determined outside the
	///     engine by custom logic if a particular plan allows a match on voluntary fund contributions.</param>
	///	<returns type="Array">An array of result objects, each of which contains the calculation results for
	///     a configured plan.  Each result object contains a planId to which it corresponds, as well as
	///     the various result values, which are currently numbers representing dollar amounts.  If
	///     formatting is required, it will need to be applied by user interface logic.
	/// </returns>

	var results, coverageLevelId, i, peopleServices, planId, fundRolloverAmountForPlan,
		voluntaryFundContributionAmountForPlan, premiumAdjustmentAmountForPlan, planFundAdditionalMatchAmountForPlan,
		singlePlanResult, startDateTime, endDateTime, elapsedMsec;

	TRACE.writeLine("{0}.calculate() called.", this.objName);
	TRACE.writeLine("regionId = {0}, statusId = {1}", regionId, statusId);

	startDateTime = new Date();

	// Perform lazy initialization of additional configuration markup.
	this.maybeMarkupConfig(config);

	// Validation of required parameters.
	if (!config.regions.hasOwnProperty(regionId))
	{
		throw new Error("Unknown regionId " + regionId);
	}
	if (!config.statuses.hasOwnProperty(statusId))
	{
		throw new Error("Unknown statusId " + statusId);
	}
	if (isNullOrUndefined(primary))
	{
		throw new Error("Parameter primary must not be null or undefined.");
	}
	if (!isArray(childrenArray))
	{
		throw new Error("The childrenArray parameter must be an array of objects. " +
			"Pass an empty array for no children.");
	}

	// Determine the appropriate coverage level based on the presence or absense of the
	// spouse and/or children input objects.
	coverageLevelId = this.determineCoverageLevel(config, spouse, childrenArray);

	results = [];

	peopleServices = [primary];
	if (!isNullOrUndefined(spouse))
	{
		peopleServices.push(spouse);
	}
	peopleServices = peopleServices.concat(childrenArray);

	// For each plan in the region, calculate the results for that plan, and insert that
	// plan's results object into the results array.
	for (i = 0; i < config.regions[regionId].plans.length; ++i)
	{
		planId = config.regions[regionId].plans[i];

		fundRolloverAmountForPlan = isNullOrUndefined(fundRolloverAmounts) ?
			0 : fundRolloverAmounts[planId] || 0;

		voluntaryFundContributionAmountForPlan = isNullOrUndefined(voluntaryFundContributionAmounts) ?
			0 : voluntaryFundContributionAmounts[planId] || 0;

		premiumAdjustmentAmountForPlan = isNullOrUndefined(premiumAdjustmentAmounts) ?
			0 : premiumAdjustmentAmounts[planId] || 0;

		planFundAdditionalMatchAmountForPlan = isNullOrUndefined(planFundAdditionalMatchAmounts) ?
			0 : planFundAdditionalMatchAmounts[planId] || 0;

		singlePlanResult = this.calculateSinglePlan(
			config, planId, regionId, statusId, coverageLevelId, peopleServices,
			fundRolloverAmountForPlan, voluntaryFundContributionAmountForPlan, premiumAdjustmentAmountForPlan,
			planFundAdditionalMatchAmountForPlan);

		results.push(singlePlanResult);
	}

	endDateTime = new Date();
	elapsedMsec = endDateTime.getTime() - startDateTime.getTime();
	results.elapsedMsec = elapsedMsec;

	TRACE.writeLine("\n{0}.calculate() returning.  Elapsed time: {1} msec.", this.objName, elapsedMsec);
	return results;
};

this._defined = true;
};

MPCE_ENGINE._definition(); // invoke above definition function
