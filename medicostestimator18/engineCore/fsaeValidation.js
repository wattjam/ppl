//-------------------------------------------------------------------------------------------------
// fsaeValidation.js
//
// Copyright (C) 2015 Mercer LLC, All Rights Reserved.
//
// Contains the FSAE_VALIDATION.checkConfig() method (and supporting methods) used to validate an
// FSAE configuration object.  While this validation logic is kept separate from the actual FSAE
// engine, this and the engine ought to be maintained together when configuration schema changes.
//
// NOTE: While the checks performed are numerous and detailed, please do not assume that these
// checks are exhaustive or constitute a substitute for more detailed testing or review.
//

//-------------------------------------------------------------------------------------------------
// Declare other referenced JS files to enable Visual Studio IntelliSense.
/// <reference path="~/js/engineCore/utility.js" />
/// <reference path="~/js/engineCore/validationBase.js" />

//-------------------------------------------------------------------------------------------------
// jslint options.  See http://www.jslint.com
/*jslint white:true, nomen:true, continue:true, plusplus:true, sloppy:true */
/*global VALIDATION_BASE, isArray, isNullOrUndefined */

// Everything in this file hangs off the following object, so we don't litter the global namespace.
var FSAE_VALIDATION = Object.create(VALIDATION_BASE);
FSAE_VALIDATION._definition = function() { // IMPORTANT: Gets called at end of the file.
"use strict";
if (this._FSAE_VALIDATION_defined) { return; }

FSAE_VALIDATION.checkAccountTypes = function(config)
{
	///	<summary>
	///	Checks the "accountTypes" and "accountTypesOrder" properties, and related configuration, for
	/// consistency and expected structure.
	///	</summary>
	/// <param name="config" type="Object">The FSAE configuration object.</param>
	///	<returns type="Boolean">True if the checks passed, false otherwise.</returns>

	var initialErrorCount = this.errors.length, success, accountTypeId, accountType, propName, propValue, propDesc;

	if (!this.checkObjectAndOrderContentsMatch(
		"accountTypes", config.accountTypes, "accountTypesOrder", config.accountTypesOrder))
	{
		return false;
	}
	for (accountTypeId in config.accountTypes)
	{
		if (config.accountTypes.hasOwnProperty(accountTypeId))
		{
			accountType = config.accountTypes[accountTypeId];
			if (!this.checkRequiredType(accountType, String.format('accountTypes["{0}"]', accountTypeId), "object"))
			{
				continue;
			}

			// First, check required properties.
			this.checkRequiredType(accountType.description,
				String.format('accountTypes["{0}"].description', accountTypeId), ["string", "object"]);
			// The "description" property can either be a string in the default language, or
			// else an object mapping strings to strings. The key is presumed to be a language
			// code, and the value is presumed to be the description in that language, but we
			// do not perform detailed validation of the keys or values.
			 if (typeof propValue === "object")
			{
				// TODO: Ensure the "description" property of type object maps strings to strings.
			} // else, it must have been a string. No further checking.

			// Next, check optional and unknown properties.
			for (propName in accountType)
			{
				if (accountType.hasOwnProperty(propName))
				{
					propDesc = String.format('accountTypes["{0}"].{1}', accountTypeId, propName);
					propValue = accountType[propName];

					switch (propName)
					{
						case "description":
							// Required; checked above.
							break;

						case "contributionLevelsMin":
						case "contributionLevelsMax":
							// The "contributionLevelsMin" and "contributionLevelsMax" properties are used by
							// the new modern HTML MPCE tool. It is expected that these properties will be
							// objects mapping a coverage level id string to a number. Since the FSAE and MPCE
							// engines are considered distinct, we don't check the coverage level ids here.
							if (this.checkOptionalType(propValue, propDesc, "object"))
							{
								// TODO: Ensure the object maps strings to numbers.
							}
							break;

						case "contributionMinimum":
						case "contributionMaximum":
						case "employerMatchRate":
						case "employerMaxMatchAmount":
							if (this.checkOptionalType(propValue, propDesc, "number"))
							{
								if (propValue < 0)
								{
									this.addError("{0} must not be negative.", propDesc);
								}
							}
							break;

						case "rolloverPermitted":
							this.checkOptionalType(propValue, propDesc, "boolean");
							break;

						default:
							this.addError('accountTypes["{0}"] contains unknown property "{1}".',
								accountTypeId, propName);
							break;
					}
				}
			}
		}
	}
	success = (initialErrorCount === this.errors.length);
	return success;
};

this.checkFederalIncomeTax = function(config)
{
	///	<summary>
	///	Checks the "federalIncomeTax" property and related configuration for consistency and
	/// expected structure.
	///	</summary>
	/// <param name="config" type="Object">The FSAE configuration object.</param>
	///	<returns type="Boolean">True if the checks passed, false otherwise.</returns>

	var initialErrorCount = this.errors.length, success, validFilingStatusIds, propName, propDesc, propValue,
		filingStatusId;
	validFilingStatusIds = ["single", "marriedFilingJoint", "marriedFilingSeparate", "headOfHousehold"];
	if (this.checkRequiredType(config.federalIncomeTax, "federalIncomeTax", "object"))
	{
		// First, check required properties.
		this.checkRequiredType(
			config.federalIncomeTax.brackets, "federalIncomeTax.brackets", "object");
		this.checkRequiredType(
			config.federalIncomeTax.rates, "federalIncomeTax.rates", "object");
		this.checkRequiredType(
			config.federalIncomeTax.standardDeductions, "federalIncomeTax.standardDeductions", "object");
		this.checkRequiredType(
			config.federalIncomeTax.personalExemptions, "federalIncomeTax.personalExemptions", "object");
		this.checkRequiredType(
			config.federalIncomeTax.dependentExemption, "federalIncomeTax.dependentExemption", "number");

		// Next, check optional and unknown properties.
		for (propName in config.federalIncomeTax)
		{
			if (config.federalIncomeTax.hasOwnProperty(propName))
			{
				propDesc = String.format('federalIncomeTax.{0}', propName);
				propValue = config.federalIncomeTax[propName];

				switch (propName)
				{
					case "brackets":
					case "rates":
						// Additional checks on these required properties.
						this.checkObjectAndOrderContentsMatch(propDesc, propValue,
							"list of valid filing status ids", validFilingStatusIds);
						for (filingStatusId in propValue)
						{
							if (propValue.hasOwnProperty(filingStatusId))
							{
								this.checkRequiredType(propValue[filingStatusId],
									String.format("{0}.{1}", propDesc, filingStatusId), "array");
							}
						}
						break;

					case "standardDeductions":
					case "personalExemptions":
						// Additional checks on these required properties.
						this.checkObjectAndOrderContentsMatch(propDesc, propValue,
							"list of valid filing status ids", validFilingStatusIds);
						for (filingStatusId in propValue)
						{
							if (propValue.hasOwnProperty(filingStatusId))
							{
								this.checkRequiredType(propValue[filingStatusId],
									String.format("{0}.{1}", propDesc, filingStatusId), "number");
							}
						}
						break;

					case "dependentExemption":
						// Required; checked above.
						break;

					default:
						this.addError('federalIncomeTax contains unknown property "{0}".', propName);
						break;
				}
			}
		}
	}
	success = (initialErrorCount === this.errors.length);
	return success;
};

this.checkFicaPayrollTaxes = function(config)
{
	///	<summary>
	///	Checks the "ficaPayrollTaxes" property and related configuration for consistency and
	/// expected structure.
	///	</summary>
	/// <param name="config" type="Object">The FSAE configuration object.</param>
	///	<returns type="Boolean">True if the checks passed, false otherwise.</returns>

	var initialErrorCount = this.errors.length, success, propName, propDesc, propValue;
	if (this.checkRequiredType(config.ficaPayrollTaxes, "ficaPayrollTaxes", "object"))
	{
		// First, check required properties.
		this.checkRequiredType(
			config.ficaPayrollTaxes.socialSecurityLimit, "ficaPayrollTaxes.socialSecurityLimit", "number");
		this.checkRequiredType(
			config.ficaPayrollTaxes.socialSecurityRate, "ficaPayrollTaxes.socialSecurityRate", "number");
		this.checkRequiredType(
			config.ficaPayrollTaxes.medicareRate, "ficaPayrollTaxes.medicareRate", "number");

		// Next, check optional and unknown properties.
		for (propName in config.ficaPayrollTaxes)
		{
			if (config.ficaPayrollTaxes.hasOwnProperty(propName))
			{
				propDesc = String.format('ficaPayrollTaxes.{0}', propName);
				propValue = config.ficaPayrollTaxes[propName];

				switch (propName)
				{
					case "socialSecurityLimit":
					case "socialSecurityRate":
					case "medicareRate":
						// Required; checked above.
						break;

					default:
						this.addError('ficaPayrollTaxes contains unknown property "{0}".', propName);
						break;
				}
			}
		}
	}
	success = (initialErrorCount === this.errors.length);
	return success;
};

this.checkConfig = function(config)
{
	///	<summary>
	/// Public (intended) method intended to be called by the test harness and any FSAE user interface to ensure
	/// the FSAE configuration object contents are consistent and meet certain defined expectations.  If errors
	/// are found, an exception is thrown containing a message with the configuration error details.
	///	</summary>
	/// <param name="config" type="Object">The FSAE configuration object.</param>
	///	<returns type="undefined"></returns>

	this.clearErrors();

	this.checkAccountTypes(config);
	this.checkFederalIncomeTax(config);
	this.checkFicaPayrollTaxes(config);

	this.throwIfErrorsExist();
};

this._FSAE_VALIDATION_defined = true;
};

FSAE_VALIDATION._definition(); // invoke above definition function
