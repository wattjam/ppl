//-------------------------------------------------------------------------------------------------
// mpceValidation.js
//
// Copyright (C) 2015 Mercer LLC, All Rights Reserved.
//
// Contains the MPCE_VALIDATION.checkConfig() method (and supporting methods) used to validate an
// MPCE configuration object.  While this validation logic is kept separate from the actual MPCE
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
var MPCE_VALIDATION = Object.create(VALIDATION_BASE);
MPCE_VALIDATION._definition = function() { // IMPORTANT: Gets called at end of the file.
"use strict";
if (this._MPCE_VALIDATION_defined) { return; }

this.checkRegions = function (config)
{
	///	<summary>
	///	Checks the "regions" and "regionsOrder" properties, and related configuration, for consistency and
	/// expected structure.
	///	</summary>
	/// <param name="config" type="Object">The MPCE configuration object.</param>
	///	<returns type="Boolean">True if the checks passed, false otherwise.</returns>

	var initialErrorCount = this.errors.length, i, success, regionId, region, planId, propName, propValue, propDesc;

	if (!this.checkObjectAndOrderContentsMatch("regions", config.regions, "regionsOrder", config.regionsOrder))
	{
		return false;
	}
	for (regionId in config.regions)
	{
		if (config.regions.hasOwnProperty(regionId))
		{
			region = config.regions[regionId];
			if (!this.checkRequiredType(region, String.format('regions["{0}"]', regionId), "object"))
			{
				continue;
			}

			// First, check required properties.
			this.checkRequiredType(region.description, String.format('regions["{0}"].description', regionId), ["string", "object"]);
			// TODO: If "description" is an object, ensure it maps strings to strings.
			if (this.checkRequiredType(region.plans, String.format('regions["{0}"].plans', regionId), "array"))
			{
				for (i = 0; i < region.plans.length; ++i)
				{
					planId = region.plans[i];
					if (config.plans && !config.plans.hasOwnProperty(planId))
					{
						this.addError('regions["{0}"].plans refers to unknown plan id "{1}".', regionId, planId);
					}
				}
			}

			// Next, check optional and unknown properties.
			for (propName in region)
			{
				if (region.hasOwnProperty(propName))
				{
					propDesc = String.format('regions["{0}"].{1}', regionId, propName);
					propValue = region[propName];

					switch (propName)
					{
						case "description":
						case "plans":
							// Required; checked above.
							break;

						default:
							this.addError('regions["{0}"] contains unknown property "{1}".', regionId, propName);
							break;
					}
				}
			}
		}
	}
	success = (initialErrorCount === this.errors.length);
	return success;
};

this.checkDeductiblesMaximumsObject = function (config, obj, propDescBase)
{
	///	<summary>
	///	Checks the "personDeductibles", "familyDeductibles", "personOutOfPocketMaximums", and
	/// "familyOutOfPocketMaximums" objects that may be defined for a plan.
	///	</summary>
	/// <param name="config" type="Object">The MPCE configuration object.</param>
	/// <param name="obj" type="Object">The deductibles or maximums object to check.</param>
	/// <param name="propDescBase" type="String">The property base description, for error reporting.</param>
	///	<returns type="Boolean">True if the checks passed, false otherwise.</returns>

	var initialErrorCount = this.errors.length, i, success, groupName, propDesc, hasGeneralGroup = false,
		isGeneralGroup, hasAmount, hasAmountMap, categoryId, categoriesMentioned = {}, propName, amountMapId,
		coverageLevelId;

	for (groupName in obj)
	{
		if (obj.hasOwnProperty(groupName))
		{
			propDesc = String.format('{0}["{1}"]', propDescBase, groupName);
			isGeneralGroup = (groupName === "general");
			hasGeneralGroup = isGeneralGroup || hasGeneralGroup;
			if (!this.checkRequiredType(obj[groupName], propDesc, "object"))
			{
				continue;
			}

			hasAmount = false;
			hasAmountMap = false;

			// First, check required properties.
			if (isGeneralGroup)
			{
				// Group "general" must not have a categories property.
				if (obj[groupName].categories !== undefined)
				{
					this.addError('{0} can\'t have a categories property; group id "general" catches all else.', propDesc);
				}
			}
			else
			{
				// Every other group must have a categories property, containing a subset of valid category ids.
				if (this.checkRequiredType(
					obj[groupName].categories, String.format('{0}.categories', propDesc), "array"))
				{
					if (config.categories)
					{
						for (i = 0; i < obj[groupName].categories.length; ++i)
						{
							categoryId = obj[groupName].categories[i];
							if (config.categories && !config.categories.hasOwnProperty(categoryId))
							{
								this.addError('{0}.categories refers to unknown category id "{1}".',
									propDesc, categoryId);
							}
							else
							{
								if (categoriesMentioned[categoryId] !== undefined)
								{
									this.addError('{0}.categories refers to category id "{1}" already used' +
										' by group id "{2}".', propDesc, categoryId, categoriesMentioned[categoryId]);
								}
								else
								{
									categoriesMentioned[categoryId] = groupName;
								}
							}
						}
					}
				}
			}

			// Next, check optional and unknown properties.
			for (propName in obj[groupName])
			{
				if (obj[groupName].hasOwnProperty(propName))
				{
					switch (propName)
					{
						case "categories":
							// Required (in most cases); checked above.
							break;

						case "amount":
							if (hasAmountMap)
							{
								this.addError('{0} can\'t have both amount and amountMap properties.', propDesc);
							}
							else
							{
								this.checkOptionalType(obj[groupName][propName], propDesc + ".amount", "number");
								hasAmount = true;
							}
							break;

						case "amountMap":
							if (hasAmount)
							{
								this.addError('{0} can\'t have both amount and amountMap properties.', propDesc);
							}
							else
							{
								if (this.checkOptionalType(obj[groupName][propName], propDesc + ".amountMap", "object"))
								{
									for (amountMapId in obj[groupName][propName])
									{
										if (obj[groupName][propName].hasOwnProperty(amountMapId))
										{
											if (config.coverageLevels.hasOwnProperty(amountMapId))
											{
												// It's a coverage level id.  It ought to map to a number.
												coverageLevelId = amountMapId;
												this.checkRequiredType(obj[groupName][propName][coverageLevelId],
													String.format('{0}.amountMap["{1}"]', propDesc, coverageLevelId),
													"number");
											}
											else if (config.regions.hasOwnProperty(amountMapId) ||
												config.statuses.hasOwnProperty(amountMapId))
											{
												// It's a region id or a status id.  Then it ought to map to an object with
												// coverage level ids.
												this.checkObjectAndOrderContentsMatch(
													String.format('{0}.amountMap["{1}"]', propDesc, amountMapId),
													obj[groupName][propName][amountMapId],
													"coverageLevelsOrder", config.coverageLevelsOrder);
												for (coverageLevelId in obj[groupName][propName][amountMapId])
												{
													if (obj[groupName][propName][amountMapId].hasOwnProperty(coverageLevelId))
													{
														this.checkRequiredType(obj[groupName][propName][amountMapId][coverageLevelId],
															String.format('{0}.amountMap["{1}"]["{2}"]', propDesc, amountMapId,
															coverageLevelId), "number");
													}
												}
											}
											else
											{
												this.addError('{0}.amountMap contains an id "{1}" that is neither a ' +
													'coverageLevelId nor a regionId nor a statusId.', propDesc, amountMapId);
											}
										}
									}
								}
								hasAmountMap = true;
							}
							break;

						default:
							this.addError('{0} contains unknown property "{1}".', propDesc, propName);
							break;
					}
				}
			}
			if (!(hasAmount || hasAmountMap))
			{
				this.addError('{0} must contain either an amount or amountMap property.', propDesc);
			}
		}
	}
	if (!hasGeneralGroup)
	{
		this.addError('{0} must contain a group with id "general".', propDescBase);
	}
	success = (initialErrorCount === this.errors.length);
	return success;
};

this.checkPlans = function (config)
{
	///	<summary>
	///	Checks the "plans" and "plansOrder" properties, and related configuration, for consistency and expected
	/// structure.
	///	</summary>
	/// <param name="config" type="Object">The MPCE configuration object.</param>
	///	<returns type="Boolean">True if the checks passed, false otherwise.</returns>

	var initialErrorCount = this.errors.length, success, planId, plan, propName, propValue, propDesc,
		amountMapId, coverageLevelId, categoryId, hasCostsObjectId, costsObjectId, costsObjectIds = {},
		serviceId, service;

	if (!this.checkObjectAndOrderContentsMatch("plans", config.plans, "plansOrder", config.plansOrder))
	{
		return false;
	}

	for (planId in config.plans)
	{
		if (config.plans.hasOwnProperty(planId))
		{
			plan = config.plans[planId];
			hasCostsObjectId = false; // until we discover otherwise
			if (!this.checkRequiredType(plan, String.format('plans["{0}"]', planId), "object"))
			{
				continue;
			}

			// First, check required properties.
			this.checkRequiredType(plan.description, String.format('plans["{0}"].description', planId), ["string", "object"]);
			// TODO: If "description" is an object, ensure it maps strings to strings.

			// Next, check optional and unknown properties.
			for (propName in plan)
			{
				if (plan.hasOwnProperty(propName))
				{
					propDesc = String.format('plans["{0}"].{1}', planId, propName);
					propValue = plan[propName];

					switch (propName)
					{
						case "description":
							// Required; checked above.
							break;

						case "mapping":
							// TODO: What kind of object should this map to?
							break;

						case "personDeductibles":
						case "familyDeductibles":
						case "personOutOfPocketMaximums":
						case "familyOutOfPocketMaximums":
							if (this.checkOptionalType(propValue, propDesc, "object"))
							{
								this.checkDeductiblesMaximumsObject(config, propValue, propDesc);
							}
							break;

						case "fundAmountMap":
							if (this.checkOptionalType(propValue, propDesc, "object"))
							{
								for (amountMapId in propValue)
								{
									if (propValue.hasOwnProperty(amountMapId))
									{
										if (config.coverageLevels.hasOwnProperty(amountMapId))
										{
											// It's a coverage level id.  It ought to map to a number.
											coverageLevelId = amountMapId;
											this.checkRequiredType(propValue[coverageLevelId],
												String.format('{0}["{1}"]', propDesc, coverageLevelId), "number");
										}
										else if (config.regions.hasOwnProperty(amountMapId) ||
											config.statuses.hasOwnProperty(amountMapId))
										{
											// It's a region id or status id.  Then it ought to map to an object with
											// coverage level ids.
											this.checkObjectAndOrderContentsMatch(
												String.format('{0}["{1}"]', propDesc, amountMapId), propValue[amountMapId],
												"coverageLevelsOrder", config.coverageLevelsOrder);
											for (coverageLevelId in propValue[amountMapId])
											{
												if (propValue[amountMapId].hasOwnProperty(coverageLevelId))
												{
													this.checkRequiredType(propValue[amountMapId][coverageLevelId],
														String.format('{0}["{1}"]["{2}"]', propDesc, amountMapId,
														coverageLevelId), "number");
												}
											}
										}
										else
										{
											this.addError('{0} contains an id "{1}" that is neither a ' +
												'coverageLevelId nor a regionId nor a statusId.', propDesc, amountMapId);
										}
									}
								}
							}
							break;

						case "categoriesFundAppliesTo":
							if (this.checkOptionalType(propValue, propDesc, "object"))
							{
								for (categoryId in propValue)
								{
									if (propValue.hasOwnProperty(categoryId))
									{
										if (config.categories && !config.categories.hasOwnProperty(categoryId))
										{
											this.addError('{0} refers to unknown category id "{1}".',
												propDesc, categoryId);
										}
										else
										{
											this.checkRequiredType(propValue[categoryId],
												String.format('{0}["{1}"]', propDesc, categoryId), "boolean");
										}
									}
								}
							}
							break;

						case "fundAllowsContributions":
							this.checkOptionalType(propValue, propDesc, "boolean");
							break;

						case "costsObjectId":
							if (this.checkOptionalType(propValue, propDesc, "string"))
							{
								if ((propValue !== "costs") && !(/^costs_/.test(propValue)))
								{
									this.addError('{0} must be "costs" or start with "costs_".', propDesc);
								}
								else
								{
									hasCostsObjectId = true;
									costsObjectId = propValue;
								}
							}
							break;

						default:
							this.addError('plans["{0}"] contains unknown property "{1}".', planId, propName);
							break;
					}
				}
			}
			// Add this plan's costs object id, if any, or "costs", to the set of costs object ids to check for later.
			costsObjectIds[hasCostsObjectId ? costsObjectId : "costs"] = true;
		}
	}
	// Check that each service mentions each of the costs object ids defined by all plans.
	if (config.services)
	{
		for (costsObjectId in costsObjectIds)
		{
			if (costsObjectIds.hasOwnProperty(costsObjectId))
			{
				for (serviceId in config.services)
				{
					if (config.services.hasOwnProperty(serviceId))
					{
						service = config.services[serviceId];
						if (typeof service === "object" && !service.hasOwnProperty(costsObjectId))
						{
							if (costsObjectId !== "costs")
							{
								this.addError('services["{0}"] is missing a costs object with id "{1}".',
									serviceId, costsObjectId);
							}
							else
							{
								this.addError('services["{0}"].costs is required.', serviceId, costsObjectId);
							}
						}
					}
				}
			}
		}
	}
	success = (initialErrorCount === this.errors.length);
	return success;
};

this.checkStatuses = function (config)
{
	///	<summary>
	///	Checks the "statuses" and "statusesOrder" properties, and related configuration, for consistency and
	/// expected structure.
	///	</summary>
	/// <param name="config" type="Object">The MPCE configuration object.</param>
	///	<returns type="Boolean">True if the checks passed, false otherwise.</returns>

	var initialErrorCount = this.errors.length, success, statusId, status, propName, propValue, propDesc;

	if (!this.checkObjectAndOrderContentsMatch("statuses", config.statuses, "statusesOrder", config.statusesOrder))
	{
		return false;
	}

	for (statusId in config.statuses)
	{
		if (config.statuses.hasOwnProperty(statusId))
		{
			status = config.statuses[statusId];
			if (!this.checkRequiredType(status, String.format('statuses["{0}"]', statusId), "object"))
			{
				continue;
			}

			// First, check required properties.
			this.checkRequiredType(
				status.description, String.format('statuses["{0}"].description', statusId), ["string", "object"]);
			// TODO: If "description" is an object, ensure it maps strings to strings.

			// Next, check optional and unknown properties.
			for (propName in status)
			{
				if (status.hasOwnProperty(propName))
				{
					propDesc = String.format('statuses["{0}"].{1}', statusId, propName);
					propValue = status[propName];

					if (propName !== "description") // only known property, already dealt with above
					{
						this.addError('statuses["{0}"] contains unknown property "{1}".', statusId, propName);
					}
				}
			}
		}
	}
	success = (initialErrorCount === this.errors.length);
	return success;
};

this.checkCoverageLevels = function (config)
{
	///	<summary>
	///	Checks the "coverageLevels" and "coverageLevelsOrder" properties, and related configuration, for
	/// consistency and expected structure.
	///	</summary>
	/// <param name="config" type="Object">The MPCE configuration object.</param>
	///	<returns type="Boolean">True if the checks passed, false otherwise.</returns>

	var initialErrorCount = this.errors.length, success, coverageLevelId, coverageLevel, propName, propValue, propDesc;

	if (!this.checkObjectAndOrderContentsMatch(
		"coverageLevels", config.coverageLevels, "coverageLevelsOrder", config.coverageLevelsOrder))
	{
		return false;
	}

	for (coverageLevelId in config.coverageLevels)
	{
		if (config.coverageLevels.hasOwnProperty(coverageLevelId))
		{
			coverageLevel = config.coverageLevels[coverageLevelId];
			if (!this.checkRequiredType(coverageLevel,
				String.format('coverageLevels["{0}"]', coverageLevelId), "object"))
			{
				continue;
			}

			// First, check required properties.
			this.checkRequiredType(coverageLevel.description,
				String.format('coverageLevels["{0}"].description', coverageLevelId), ["string", "object"]);
			// TODO: If "description" is an object, ensure it maps strings to strings.

			this.checkRequiredType(coverageLevel.spouse,
				String.format('coverageLevels["{0}"].spouse', coverageLevelId), "boolean");
			this.checkRequiredType(coverageLevel.maxNumChildren,
				String.format('coverageLevels["{0}"].maxNumChildren', coverageLevelId), "number");

			// Next, check optional and unknown properties.
			for (propName in coverageLevel)
			{
				if (coverageLevel.hasOwnProperty(propName))
				{
					propDesc = String.format('coverageLevels["{0}"].{1}', coverageLevelId, propName);
					propValue = coverageLevel[propName];

					switch (propName)
					{
						case "description":
						case "spouse":
						case "maxNumChildren":
							// Required; checked above.
							break;

						default:
							this.addError('coverageLevels["{0}"] contains unknown property "{1}".',
								coverageLevelId, propName);
							break;
					}
				}
			}
		}
	}
	success = (initialErrorCount === this.errors.length);
	return success;
};

this.checkCoverageLevelCostsPerPlan = function (config)
{
	///	<summary>
	///	Checks the "coverageLevelsCostPerPlan" property, and related configuration, for consistency and
	/// expected structure.
	///	</summary>
	/// <param name="config" type="Object">The MPCE configuration object.</param>
	///	<returns type="Boolean">True if the checks passed, false otherwise.</returns>

	var initialErrorCount = this.errors.length, success, planId, coverageLevelOrRegionId, regionId, coverageLevelId,
		statusId, amount;

	if (!this.checkObjectAndOrderContentsMatch(
		"coverageLevelCostsPerPlan", config.coverageLevelCostsPerPlan, "plansOrder", config.plansOrder))
	{
		return false;
	}

	for (planId in config.coverageLevelCostsPerPlan)
	{
		if (config.coverageLevelCostsPerPlan.hasOwnProperty(planId))
		{
			for (coverageLevelOrRegionId in config.coverageLevelCostsPerPlan[planId])
			{
				if (config.coverageLevelCostsPerPlan[planId].hasOwnProperty(coverageLevelOrRegionId))
				{
					// The next level could be either a coverageLevelId, or a regionId.
					if (config.regions && config.regions.hasOwnProperty(coverageLevelOrRegionId))
					{
						// It's a region id.
						regionId = coverageLevelOrRegionId;
						this.checkObjectAndOrderContentsMatch(
							String.format('coverageLevelCostsPerPlan["{0}"]["{1}"]', planId, regionId),
							config.coverageLevelCostsPerPlan[planId][regionId],
							"coverageLevelsOrder", config.coverageLevelsOrder);
						for (coverageLevelId in config.coverageLevelCostsPerPlan[planId][regionId])
						{
							if (config.coverageLevelCostsPerPlan[planId][regionId].hasOwnProperty(coverageLevelId))
							{
								this.checkObjectAndOrderContentsMatch(String.format(
									'coverageLevelCostsPerPlan["{0}"]["{1}"]["{2}"]', planId, regionId, coverageLevelId),
									config.coverageLevelCostsPerPlan[planId][regionId][coverageLevelId],
									"statusesOrder", config.statusesOrder);
								for (statusId in config.coverageLevelCostsPerPlan[planId][regionId][coverageLevelId])
								{
									if (config.coverageLevelCostsPerPlan[planId][regionId][coverageLevelId].
										hasOwnProperty(statusId))
									{
										amount = config.coverageLevelCostsPerPlan[planId][regionId][coverageLevelId][statusId];
										if (typeof amount !== "number" && amount !== null)
										{
											this.addError('coverageLevelCostsPerPlan["{0}"]["{1}"]["{2}"]["{3}"]' +
												' must be a number or null if n/a.',
												planId, regionId, coverageLevelId, statusId);
										}
									}
								}
							}
						}
					}
					else
					{
						// Not a region id; should therefore be a coverage level id.
						if (config.coverageLevels && !config.coverageLevels.hasOwnProperty(coverageLevelOrRegionId))
						{
							this.addError('coverageLevelCostsPerPlan["{0}"] contains id "{1}" ' +
								'not found in regions or coverageLevels.', planId, coverageLevelOrRegionId);
						}
						coverageLevelId = coverageLevelOrRegionId;
						this.checkObjectAndOrderContentsMatch(
							String.format('coverageLevelCostsPerPlan["{0}"]["{1}"]', planId, coverageLevelId),
							config.coverageLevelCostsPerPlan[planId][coverageLevelId],
							"statusesOrder", config.statusesOrder);
						for (statusId in config.coverageLevelCostsPerPlan[planId][coverageLevelId])
						{
							if (config.coverageLevelCostsPerPlan[planId][coverageLevelId].
								hasOwnProperty(statusId))
							{
								amount = config.coverageLevelCostsPerPlan[planId][coverageLevelId][statusId];
								if (typeof amount !== "number" && amount !== null)
								{
									this.addError('coverageLevelCostsPerPlan["{0}"]["{1}"]["{2}"]' +
										' must be a number or null if n/a.', planId, coverageLevelId, statusId);
								}
							}
						}
					}
				}
			}
		}
	}
	success = (initialErrorCount === this.errors.length);
	return success;
};

this.checkServicePlanCoverageObject = function (config, obj, propDescBase)
{
	///	<summary>
	///	Helper for checkServices().  Checks a plan coverage object defined within a service.
	///	</summary>
	/// <param name="obj" type="Object">The service plan coverage object to check.</param>
	/// <param name="propDescBase" type="String">The property base description, for error reporting.</param>
	///	<returns type="Boolean">True if the checks passed, false otherwise.</returns>

	var initialErrorCount = this.errors.length, success, hasAtLeastOneProperty, propName, propDesc, propValue,
		hasCopay, hasCoveredCount, hasDollarLimit;
	if (this.checkOptionalType(obj, propDescBase, "object"))
	{
		hasAtLeastOneProperty = false;
		hasCopay = false;
		hasCoveredCount = false;
		hasDollarLimit = false;
		for (propName in obj)
		{
			if (obj.hasOwnProperty(propName))
			{
				hasAtLeastOneProperty = true;
				propDesc = String.format('{0}.{1}', propDescBase, propName);
				propValue = obj[propName];

				switch (propName)
				{
					case "coinsurance":
						if (this.checkOptionalType(propValue, propDesc, "number"))
						{
							if (propValue < 0 || propValue > 1)
							{
								this.addError("{0} must be in the range [0, 1].", propDesc);
							}
						}
						break;

					case "coinsuranceMinDollar":
					case "coinsuranceMaxDollar":
					case "copay":
						if (this.checkOptionalType(propValue, propDesc, "number"))
						{
							if (propValue < 0)
							{
								this.addError("{0} must not be negative.", propDesc);
							}
						}
						if (propName === "copay")
						{
							hasCopay = true;
						}
						break;

					case "coinsuranceNotTowardsOOPMax":
					case "copayNotTowardsOOPMax":
						this.checkOptionalType(propValue, propDesc, "boolean");
						break;

					case "coveredCount":
						if (this.checkOptionalType(propValue, propDesc, "number"))
						{
							if (propValue < 0)
							{
								this.addError("{0} must not be negative.", propDesc);
							}
							if (propValue !== Math.round(propValue))
							{
								this.addError("{0} must be a whole number.", propDesc);
							}
						}
						hasCoveredCount = true;
						break;

					case "dollarLimit":
						if (this.checkOptionalType(propValue, propDesc, "number"))
						{
							if (propValue < 0)
							{
								this.addError("{0} must not be negative.", propDesc);
							}
							if (propValue !== Math.round(propValue))
							{
								this.addError("{0} must be a whole number.", propDesc);
							}
						}
						hasDollarLimit = true;
						break;

					case "deductible":
						this.checkOptionalType(propValue, propDesc, "string");
						switch (propValue)
						{
							case "none":
							case "beforeCopay":
							case "afterCopay":
							case "beforeCoinsurance":
								break;

							default:
								this.addError('{0} must be one of:' +
									' "none", "beforeCopay", "afterCopay", "beforeCoinsurance".', propDesc);
						}
						break;

					case "notCovered":
						if (this.checkOptionalType(propValue, propDesc, "boolean"))
						{
							if (!propValue)
							{
								this.addError("{0} must be false if specified; leave it out if true.", propDesc);
							}
						}
						break;

					case "singleUseCostMax":
						if (this.checkOptionalType(propValue, propDesc, "number"))
						{
							if (propValue < 0)
							{
								this.addError("{0} must not be negative.", propDesc);
							}
						}
						break;

					case "combinedLimitId":
						if (this.checkOptionalType(propValue, propDesc, "string"))
						{
							if (!config.combinedLimits.hasOwnProperty(propValue))
							{
								this.addError('{0} refers to unknown combined limit id "{1}".', propDesc, propValue);
							}
						}
						break;

					default:
						this.addError('{0} contains unknown property "{1}".', propDescBase, propName);
						break;
				}
			}
		}
		if (!hasAtLeastOneProperty)
		{
			this.addError('{0} must have properties; minimum is "notCovered: true".', propDescBase);
		}
		if (hasCopay && hasDollarLimit)
		{
			this.addError('{0} specifies "copay" and "dollarLimit"; dollar limits are only supported with coinsurance.', propDescBase);
		}
		if (hasCoveredCount && hasDollarLimit)
		{
			this.addError('{0} specifies both "coveredCount" and "dollarLimit"; only one or the other may be specified.', propDescBase);
		}
	}
	success = (initialErrorCount === this.errors.length);
	return success;
};

this.checkServices = function (config)
{
	///	<summary>
	///	Checks the "services" property, and related configuration, for consistency and expected structure.
	///	</summary>
	/// <param name="config" type="Object">The MPCE configuration object.</param>
	///	<returns type="Boolean">True if the checks passed, false otherwise.</returns>

	var initialErrorCount = this.errors.length, success, serviceId, service, propName, propValue, propDesc,
		planId, servicePlanCoverage, i, expectedTypeName, regionId;
	if (!this.checkRequiredType(config.services, "services", "object"))
	{
		return false;
	}

	for (serviceId in config.services)
	{
		if (config.services.hasOwnProperty(serviceId))
		{
			service = config.services[serviceId];
			if (!this.checkRequiredType(service, String.format('services["{0}"]', serviceId), "object"))
			{
				continue;
			}

			// First, check required properties.
			this.checkRequiredType(service.description,
				String.format('services["{0}"].description', serviceId), ["string", "object"]);
			// TODO: If "description" is an object, ensure it maps strings to strings.

			propDesc = String.format('services["{0}"].coverage', serviceId);
			if (this.checkRequiredType(service.coverage, propDesc, "object"))
			{
				if (this.checkObjectAndOrderContentsMatch(propDesc, service.coverage, "plansOrder", config.plansOrder))
				{
					for (planId in service.coverage)
					{
						if (service.coverage.hasOwnProperty(planId))
						{
							servicePlanCoverage = service.coverage[planId];
							if (isArray(servicePlanCoverage))
							{
								for (i = 0; i < servicePlanCoverage.length; ++i)
								{
									this.checkServicePlanCoverageObject(config, servicePlanCoverage[i],
									String.format('{0}["{1}"][{2}]', propDesc, planId, i));
								}
							}
							else
							{
								this.checkServicePlanCoverageObject(config, servicePlanCoverage,
									String.format('{0}["{1}"]', propDesc, planId));
							}
						}
					}
				}
			}

			// Next, check optional and unknown properties.
			for (propName in service)
			{
				if (service.hasOwnProperty(propName))
				{
					propDesc = String.format('services["{0}"].{1}', serviceId, propName);
					propValue = service[propName];

					switch (propName)
					{
						case "description":
						case "coverage":
							// Required; checked above.
							break;

						case "costs":
						case "costsForDisplay":
							// Note: Though not likely, technically "costs" is optional, but only if all plans define
							// their own costsObjectIds.  So that's why "costs" isn't required, if you were wondering.
							// Refer to checkPlans(); it checks that each service has matching costs object ids.
							expectedTypeName = (propName === "costs") ? "number" : "string";
							if (this.checkOptionalType(propValue, propDesc, "object"))
							{
								for (regionId in config.services[serviceId][propName])
								{
									if (config.services[serviceId][propName].hasOwnProperty(regionId))
									{
										this.checkRequiredType(propValue[regionId],
											String.format('{0}["{1}"]', propDesc, regionId), expectedTypeName);
										if (config.regions && !config.regions.hasOwnProperty(regionId))
										{
											this.addError('{0} refers to unknown region id "{1}".', propDesc, regionId);
										}
									}
								}
							}
							break;

						default:
							// Check for special case of a custom costs_NNN object.
							if (/^costs_/.test(propName))
							{
								if (this.checkOptionalType(propValue, propDesc, "object"))
								{
									for (regionId in config.services[serviceId][propName])
									{
										if (config.services[serviceId][propName].hasOwnProperty(regionId))
										{
											this.checkRequiredType(propValue[regionId],
												String.format('{0}["{1}"]', propDesc, regionId), "number");

											if (config.regions && !config.regions.hasOwnProperty(regionId))
											{
												this.addError('{0} refers to unknown region id "{1}".', propDesc,
													regionId);
											}
										}
									}
								}
								continue;
							}
							this.addError('services["{0}"] contains unknown property "{1}".', serviceId, propName);
							break;
					}
				}
			}
		}
	}
	success = (initialErrorCount === this.errors.length);
	return success;
};

this.checkCombinedLimits = function (config)
{
	///	<summary>
	///	Checks the "combinedLimits" property, and related configuration, for consistency and expected structure.
	///	</summary>
	///	<param name="config" type="Object">The MPCE configuration object.</param>
	///	<returns type="Boolean">True if the checks passed, false otherwise.</returns>

	var initialErrorCount = this.errors.length, success, combinedLimitId, combinedLimit, propName, propValue, propDesc;

	if( !this.checkOptionalType(config.combinedLimits, "combinedLimits", "object") )
	{
		return false;
	}

	for (combinedLimitId in config.combinedLimits)
	{
		if (config.combinedLimits.hasOwnProperty(combinedLimitId))
		{
			combinedLimit = config.combinedLimits[combinedLimitId];
			if (!this.checkRequiredType(combinedLimit, String.format('combinedLimits["{0}"]', combinedLimitId), "object"))
			{
				continue;
			}

			// First, check required properties.
			this.checkRequiredType(combinedLimit.description,
				String.format('combinedLimits["{0}"].description', combinedLimitId), ["string", "object"]);
			// TODO: If "description" is an object, ensure it maps strings to strings.

			// Next, check optional and unknown properties.
			for (propName in combinedLimit)
			{
				if (combinedLimit.hasOwnProperty(propName))
				{
					propDesc = String.format('combinedLimits["{0}"].{1}', combinedLimitId, propName);
					propValue = combinedLimit[propName];

					switch (propName)
					{
						case "description":
							// Required; checked above.
							break;

						case "personReimburseLimit":
						case "familyReimburseLimit":
							if (this.checkOptionalType(propValue, propDesc, "number"))
							{
								if (propValue < 0)
								{
									this.addError("{0} must not be negative.", propDesc);
								}
							}
							break;

						default:
							this.addError('combinedLimits["{0}"] contains unknown property "{1}".', combinedLimitId, propName);
							break;
					}
				}
			}
		}
	}

	success = (initialErrorCount === this.errors.length);
	return success;
};

this.checkCategories = function (config)
{
	///	<summary>
	///	Checks the "categories" and "categoriesOrder" properties, and related configuration, for consistency
	/// and expected structure.
	///	</summary>
	/// <param name="config" type="Object">The MPCE configuration object.</param>
	///	<returns type="Boolean">True if the checks passed, false otherwise.</returns>

	var initialErrorCount = this.errors.length, success, allCategoryContents, categoryId, category, propName,
		propValue, propDesc;

	if (!this.checkObjectAndOrderContentsMatch(
		"categories", config.categories, "categoriesOrder", config.categoriesOrder))
	{
		return false;
	}

	allCategoryContents = [];
	for (categoryId in config.categories)
	{
		if (config.categories.hasOwnProperty(categoryId))
		{
			category = config.categories[categoryId];
			if (!this.checkRequiredType(category, String.format('categories["{0}"]', categoryId), "object"))
			{
				continue;
			}

			// First, check required properties.
			this.checkRequiredType(category.description,
				String.format('categories["{0}"].description', categoryId), ["string", "object"]);
			// TODO: If "description" is an object, ensure it maps strings to strings.

			if (this.checkRequiredType(category.orderedContents,
				String.format('categories["{0}"].orderedContents', categoryId), "array"))
			{
				allCategoryContents = allCategoryContents.concat(category.orderedContents);
			}

			// Next, check optional and unknown properties.
			for (propName in category)
			{
				if (category.hasOwnProperty(propName))
				{
					propDesc = String.format('categories["{0}"].{1}', categoryId, propName);
					propValue = category[propName];

					switch (propName)
					{
						case "description":
						case "orderedContents":
							// Required; checked above.
							break;

						default:
							this.addError('categories["{0}"] contains unknown property "{1}".', categoryId, propName);
							break;
					}
				}
			}
		}
	}
	if (config.services)
	{
		this.checkObjectAndOrderContentsMatch(
			"services", config.services, "combined category orderedContents", allCategoryContents);
	}
	success = (initialErrorCount === this.errors.length);
	return success;
};

this.checkHealthStatuses = function (config)
{
	///	<summary>
	///	Checks the "healthStatuses" and "healthStatusesOrder" properties, and related configuration, for
	/// consistency and expected structure.
	///	</summary>
	/// <param name="config" type="Object">The MPCE configuration object.</param>
	///	<returns type="Boolean">True if the checks passed, false otherwise.</returns>

	var initialErrorCount = this.errors.length, success, healthStatusId, healthStatus, serviceId, propName, propValue,
		propDesc;

	if (!this.checkObjectAndOrderContentsMatch(
		"healthStatuses", config.healthStatuses, "healthStatusesOrder", config.healthStatusesOrder))
	{
		return false;
	}

	for (healthStatusId in config.healthStatuses)
	{
		if (config.healthStatuses.hasOwnProperty(healthStatusId))
		{
			healthStatus = config.healthStatuses[healthStatusId];
			if (!this.checkRequiredType(healthStatus,
				String.format('healthStatuses["{0}"]', healthStatusId), "object"))
			{
				continue;
			}

			// First, check required properties.
			this.checkRequiredType(
				healthStatus.description, String.format('healthStatuses["{0}"].description', healthStatusId), ["string", "object"]);
			// TODO: If "description" is an object, ensure it maps strings to strings.

			if (this.checkRequiredType(healthStatus.contents,
				String.format('healthStatuses["{0}"].contents', healthStatusId), "object"))
			{
				for (serviceId in healthStatus.contents)
				{
					if (healthStatus.contents.hasOwnProperty(serviceId))
					{
						if (config.services && !config.services.hasOwnProperty(serviceId))
						{
							this.addError('healthStatuses["{0}"].contents refers to unknown service id "{1}".',
								 healthStatusId, serviceId);
						}
						this.checkRequiredType(healthStatus.contents[serviceId],
							String.format('healthStatuses["{0}"].contents["{1}"]', healthStatusId, serviceId),
							"number");
					}
				}
			}

			// Next, check optional and unknown properties.
			for (propName in healthStatus)
			{
				if (healthStatus.hasOwnProperty(propName))
				{
					propDesc = String.format('healthStatuses["{0}"].{1}', healthStatusId, propName);
					propValue = healthStatus[propName];

					switch (propName)
					{
						case "description":
						case "contents":
							// Required; checked above.
							break;

						case "customColor":
							// TODO: Make sure it is an HTML color code or name.
							break;

						default:
							this.addError('healthStatuses["{0}"] contains unknown property "{1}".', healthStatusId,
								propName);
							break;
					}
				}
			}
		}
	}
	success = (initialErrorCount === this.errors.length);
	return success;
};

this.checkConfig = function (config)
{
	///	<summary>
	/// Public (intended) method intended to be called by the test harness and any MPCE user interface to ensure
	/// the MPCE configuration object contents are consistent and meet certain defined expectations.  If errors
	/// are found, an exception is thrown containing a message with the configuration error details.
	///	</summary>
	/// <param name="config" type="Object">The MPCE configuration object.</param>
	///	<returns type="undefined"></returns>

	this.clearErrors();

	this.checkRegions(config);
	this.checkPlans(config);
	this.checkStatuses(config);
	this.checkCoverageLevels(config);
	this.checkCoverageLevelCostsPerPlan(config);
	this.checkServices(config);
	this.checkCombinedLimits(config);
	this.checkCategories(config);
	this.checkHealthStatuses(config);

	this.throwIfErrorsExist();
};

this._MPCE_VALIDATION_defined = true;
};

MPCE_VALIDATION._definition(); // invoke above definition function
