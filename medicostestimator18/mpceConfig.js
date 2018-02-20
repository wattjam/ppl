//-------------------------------------------------------------------------------------------------
// mpceConfig.js
//
// Copyright (C) 2017 Mercer LLC, All Rights Reserved.
//
// This file contains the principal configuration for a given Medical Plan Cost Estimator (MPCE).
// This configuration is intended to contain client-specific customization to drive the generic
// MPCE engine in a data-driven fashion, permitting it to be maintained as common across clients.
// Briefly, the MPCE configuration object describes:
//
//     * (Geographic) REGIONS, e.g. states, other regions, location, etc.
//     * (Medical) PLANS, e.g. PPO, HMO, HDHP plans, in- and out-of-network plan variants, etc.
//     * (Employee) STATUSES, e.g. full-time, part-time, retired, etc.
//     * COVERAGE LEVELS, e.g. employee, employee + children, employee + spouse, family, etc.
//     * (Medical) SERVICES, e.g. doctor visit, hospital stay, 30-day drug prescription, etc.
//     * CATEGORIES (of services), e.g. medical services, drugs, preventive, etc.
//     * HEALTH STATUSES, bundling a set of services, e.g. low user, medium user, high user, etc.
//
// For more detail, please refer to the sections below. 
//

//-------------------------------------------------------------------------------------------------
// jslint options.  See http://www.jslint.com
/*jslint white:true, nomen:true, continue:true, plusplus:true, sloppy:true */

// Everything in this file hangs off the following object, so we don't litter the global namespace.
var MPCE_CONFIG = {};
MPCE_CONFIG._definition = function() { // IMPORTANT: Gets called at end of the file.
"use strict";
if (this._defined) { return; }

//-------------------------------------------------------------------------------------------------
// regions: Defines the regions (states, or otherwise) included in the MPCE.
//
// Structure: Object mapping string region ids, each to an object containing properties as follows:
//
// - description: Required string property containing the region name suitable for display.
// - plans: Required array property containing the valid plan ids for the region, each of which
//       must be defined in this.plans.
//
this.regions =
{
	"AZ":
	{
		description: "Arizona",
		plans: ["PPO_300", "CDHP", "HMO_AZ"]
	},

	"CA":
	{
		description: "California",
		plans: ["PPO_300", "CDHP", "HMO_CA"]
	},

	"NE":
	{
		description: "Nebraska",
		plans: ["PPO_300", "CDHP"]
	},

	"UT":
	{
		description: "Utah",
		plans: ["PPO_300", "CDHP", "HMO_UT"]
	},

	"OTHER_LOCATIONS":
	{
		description: "All Other Locations",
		plans: ["PPO_300", "CDHP"]
	}
};

//-------------------------------------------------------------------------------------------------
// regionsOrder: An array defining the order in which regions are to be displayed
//     and/or iterated over.  The set of region ids here must match exactly the set of region ids
//     defined in this.regions above.
//
this.regionsOrder = ["AZ", "CA", "NE", "UT", "OTHER_LOCATIONS"];

//-------------------------------------------------------------------------------------------------
// plans: Defines the medical plans included in the MPCE.  Medical plans have
//   a description, deductible and out-of-pocket-maximum either per person and/or family, and
//   optional HSA/HRA base fund amounts built into the plan.
//
// Structure: Object mapping string plan ids, each to an object containing properties as follows:
//
// - description: Required string property containing the plan name suitable for display.
// - personDeductibles: Optional object describing per-person deductible groups and amounts or
//     amount maps; see below*.
// - familyDeductibles: Optional object describing family deductible groups and amounts or
//     amount maps; see below*.
// - personOutOfPocketMaximums: Optional object describing per-person out of pocket maximum
//     groups and amounts or amount maps; see below*.
// - familyOutOfPocketMaximums: Optional object describing family out of pocket maximum groups
//     and amounts or amount maps; see below*.
// - fundAmountMap: Optional object mapping a coverage level id string to a fund amount included
//     in the plan.  If plan has a fund, the fund can be drawn down first to cover all
//     or only certain categories of expenses.  You could also map first to region ids or status
//     ids then tp coverage level ids to amounts (if for some reason you would like to use
//     different amounts according to region or status.)
// - categoriesFundAppliesTo: Optional object mapping a category id to a boolean value.  If a
//     plan has a fund, the expense categories with the value true are the categories of expenses
//     to which the fund amount can be applied.
// - fundAllowsContributions: Optional boolean indicating whether the fund allows contributions, or
//     not.  Not currently used by the engine, but can be used by the user interface for prompting.
// - costsObjectId: Optional string property providing the name of the service costs object.  This
//     string must begin with "costs_".  For example, "costs_PPO_IN".  By default, the costs for a
//     service (see services description) will be contained in a property named "costs", but that
//     can be overridden per-plan by specifying a costsObjectId property in a plan here.
//
// * On deductibles and out of pocket maximums: Each of the deductibles and out of pocket maximums
// objects referred to above must contain at least a group named "general".  Additional named
// groups may be created as needed and must specify a "categories" array property indicating the
// category ids the named group applies to.  Furthermore, each group can then contain either a
// single "amount" property (a number) or an "amountMap" object property which would map coverage
// level ids to amounts.  You could also map first to region ids or status ids then to coverage
// level ids to amounts (if for some reason you would like to use different amounts according to
// region or status.)
//
// While plan configuration can be complex, there is sufficient flexibility to enable, say, a
// plan where there are separate drug deductibles and out of pocket maximums, etc.  Furthermore,
// a plan could use only per-person deductibles/maximums,  family deductibles/maximums, or both.
//
this.plans =
{
	"PPO_300":
	{
		description: "United Healthcare\n $300 Deductible", 
		personDeductibles:
		{
			"general": { amount: 300 }
		},
		familyDeductibles:
		{
			"general": { amount: 900 }
		},
		personOutOfPocketMaximums: 
		{
			"general": { amount: 2300 }
		},
		familyOutOfPocketMaximums:
		{
			"general": { amount: 4900 }
		}
	},
	
	"CDHP":
	{
		description: "    United Healthcare\n      CDHP with HSA&#185;", // superscripted 1
		familyDeductibles:
		{
			"general":
			{
				amountMap:
				{
					"employeeOnly": 1500,
					"employeeAndSpouse": 3000,
					"employeeAndChild": 3000,
					"employeeAndChildren": 3000,
					"employeeAndFamily": 3000
				}
			}
		},
		familyOutOfPocketMaximums:
		{
			"general":
			{
				amountMap:
				{
					"employeeOnly": 3500,
					"employeeAndSpouse": 7000,
					"employeeAndChild": 7000,
					"employeeAndChildren": 7000,
					"employeeAndFamily": 7000
				}
			}
		},
		fundAmountMap:
		{
			"employeeOnly": 450,
			"employeeAndSpouse": 900,
			"employeeAndChild": 900,
			"employeeAndChildren": 900,
			"employeeAndFamily": 900
		},
		categoriesFundAppliesTo:
		{
			"outpatient": true,
			"inpatient": true,
			"drugs": true
		},
		fundAllowsContributions: true
	},

	"HMO_CA":
	{
		description: "Kaiser HMO", 
		personDeductibles:
		{
			"general": { amount: 0 }
		},
		familyDeductibles:
		{
			"general": { amount: 0 }
		},
		personOutOfPocketMaximums:
		{
			"general": { amount: 1500 }
		},
		familyOutOfPocketMaximums:
		{
			"general": { amount: 3000 }
		}
	},
	
	"HMO_AZ":
	{
		description: "Health Net\n    HMO", 
		personDeductibles:
		{
			"general": { amount: 0 }
		},
		familyDeductibles:
		{
			"general": { amount: 0 }
		},
		personOutOfPocketMaximums:
		{
			"general": { amount: 2000 },
			"oopmax_rx":
			{
				categories: ["drugs"],
				amount: 1000
			}
		},
		familyOutOfPocketMaximums:
		{
			"general": { amount: 4000 },
			"oopmax_rx":
			{
				categories: ["drugs"],
				amount: 2000
			}
		}
	},
	
	"HMO_UT":
	{
		description: "SelectHealth\n      HMO", 
		personDeductibles:
		{
			"general": { amount: 150 }
		},
		familyDeductibles:
		{
			"general": { amount: 300 }
		},
		personOutOfPocketMaximums:
		{
			"general": { amount: 1500 }
		},
		familyOutOfPocketMaximums:
		{
			"general": { amount: 3000 }
		}
	}
};

//-------------------------------------------------------------------------------------------------
// plansOrder: An array defining the order in which plans are to be displayed and/or
//     iterated over.  The set of plan ids here must match exactly the set of plan ids defined in
//     this.plans above.
//
this.plansOrder = ["PPO_300", "CDHP", "HMO_AZ", "HMO_CA", "HMO_UT"];

//-------------------------------------------------------------------------------------------------
// statuses: Defines the employee statuses included in the MPCE.
//
// Structure: Object mapping string status ids, each to an object containing properties as follows:
//
// - description: Required string property containing the status name suitable for display.
//
// Employee statuses are principally used to select the coverage level cost per plan.  For instance,
// full-time employees may pay a different premium than part-time employees.  See also the
// configuration for coverageLevelCostsPerPlan, below.
//
this.statuses =
{
	"fullTime": { description: "Full-time (30 or more hours per week)" }
};

//-------------------------------------------------------------------------------------------------
// statusesOrder: An array defining the order in which statuses are to be displayed
//     and/or iterated over.  The set of status ids here must match exactly the set of status ids
//     defined in this.statuses above.
//
this.statusesOrder = ["fullTime"];

//-------------------------------------------------------------------------------------------------
// coverageLevels: Defines the available coverage levels included in the MPCE.
//   A "coverage level" typically indicates whether medical plan coverage is for the employee only,
//   employee plus spouse, family, etc.
//
// Structure: Object mapping string coverage level ids, each to an object containing properties
//   as follows:
//
// - description: Required string property containing the coverage level name suitable for display.
// - spouse: Required boolean property indicating whether the coverage level includes spousal
//     coverage (true), or not (false).
// - maxNumChildren: Required number property containing the maximum number of children covered by
//     the coverage level.  If no children are covered at the coverage level, set zero.  If some
//     finite number of children are covered, set that number.  If an unlimited number of children
//     can be covered, set Infinity -- though practically, the engine won't currently accept more
//     than 3 children.
//
// IMPORTANT NOTE:  Coverage levels are selected automatically by the MPCE engine logic based on
// the presence of a spouse and/or some number of children.  In order for the MPCE engine logic to
// correctly select the best coverage level (i.e. without excess coverage), the order defined by
// coverageLevelsOrder needs to be correct.  Please refer to coverageLevelOrders, directly below.
//
this.coverageLevels =
{
	"employeeOnly": { description: "Employee only", spouse: false, maxNumChildren: 0 },
	"employeeAndSpouse": { description: "Employee + spouse", spouse: true, maxNumChildren: 0 },
	"employeeAndChild": { description: "Employee + child", spouse: false, maxNumChildren: 1 },
	"employeeAndChildren": { description: "Employee + children", spouse: false, maxNumChildren: Infinity },
	"employeeAndFamily": { description: "Employee + family", spouse: true, maxNumChildren: Infinity }
};

//-------------------------------------------------------------------------------------------------
// coverageLevelsOrder: An array defining the order in which coverage levels are
//     to be displayed and/or iterated over.  The set of coverage level ids here must match exactly
//     the set of coverage level ids defined in this.coverageLevels above.
//
// IMPORTANT NOTE: The coverage levels MUST be ordered so that the number of children covered is
// strictly increasing, so that the MPCE engine's logic to select the most appropriate coverage
// level functions correctly.
//
this.coverageLevelsOrder = ["employeeOnly", "employeeAndSpouse", "employeeAndChild", "employeeAndChildren", "employeeAndFamily"];

//-------------------------------------------------------------------------------------------------
// coverageLevelCostsPerPlan: Defines the annual premium costs for each plan, by
//   region (optional), then plan coverage level, then by employee status.
//
// Structure: Object mapping string plan ids, each to an object containing properties as follows:
//
// EITHER:
//
// (A) Where costs DO vary by region (more complex), then each plan id's object should map from
//     regionId to another object mapping coverageLevelId to another object mapping statusId to
//     a number.  (Basically, there's another level for regionId.)
//
// (B) Where costs DON'T vary by region (simpler), then each plan id's object should map from
//     coverageLevelId to another object mapping employee statusId to a number.
//
// Note: The above models could also be mixed; for example, to provide default costs for
// all regions, yet specialize one or a few (but not all) of the regions.
//

this.coverageLevelCostsPerPlan = 
{
	"PPO_300":
	{
		"employeeOnly":			{ "fullTime": 1248 },
		"employeeAndSpouse":	{ "fullTime": 4238 },
		"employeeAndChild":		{ "fullTime": 3588 },
		"employeeAndChildren":	{ "fullTime": 3588 },
		"employeeAndFamily":	{ "fullTime": 6006 }
	},

	"CDHP":
	{
		"employeeOnly":			{ "fullTime": 1014 },
		"employeeAndSpouse":	{ "fullTime": 3198 },
		"employeeAndChild":		{ "fullTime": 2990 },
		"employeeAndChildren":	{ "fullTime": 2990 },
		"employeeAndFamily":	{ "fullTime": 4134 }
	},

	"HMO_CA":
	{
		"employeeOnly":			{ "fullTime":  936 },
		"employeeAndSpouse":	{ "fullTime": 3120 },
		"employeeAndChild":		{ "fullTime": 2548 },
		"employeeAndChildren":	{ "fullTime": 2548 },
		"employeeAndFamily":	{ "fullTime": 4394 }
	},

	"HMO_AZ":
	{
		"employeeOnly":			{ "fullTime": 1274 },
		"employeeAndSpouse":	{ "fullTime": 4524 },
		"employeeAndChild":		{ "fullTime": 3822 },
		"employeeAndChildren":	{ "fullTime": 3822 },
		"employeeAndFamily":	{ "fullTime": 6474 }
	},

	"HMO_UT":
	{
		"employeeOnly":			{ "fullTime": 1222 },
		"employeeAndSpouse":	{ "fullTime": 3952 },
		"employeeAndChild":		{ "fullTime": 3276 },
		"employeeAndChildren":	{ "fullTime": 3276 },
		"employeeAndFamily":	{ "fullTime": 5590 }
	}
};

//-------------------------------------------------------------------------------------------------
// services: Defines the services included in the MPCE.  A "service" is a medical
//   service for which a given medical plan's insurance coverage may or may not apply.  Examples
//   of services include routine physicals, drug prescriptions, etc.  Users use the MPCE to model
//   the costs of each of the medical plans over a selected set of services.
//
// Structure: Object mapping string service ids, each to an object containing properties as
//   follows:
//
// - description: Required string property containing the service name suitable for display.
// - costs: Required object property mapping string region ids, each to a number representing the
//     average cost of the service for that region.
// - [Additional custom costs objects]:  Where costsObjectId was used in the definition of a plan
//     above, the service object can contain additional named costs objects, e.g. "costs_PPO_IN".
//     The structure of these additional costs object are identical to "costs", above.
// - costsForDisplay: Optional object property mapping string region ids, each to a string
//     representing the range of costs for the service.  costsForDisplay may be referred to by
//     the user interface in lieu of costs, but is otherwise not used by the MPCE engine logic.
// - coverage: A coverage object contains one plan coverage object per plan id.  The plan coverage
//     object is usually a single object describing the copay amount and/or coinsurance percentage
//     in that plan, but in special cases it can be an array; see below*.  When the plan coverage
//     object is a SINGLE object, that object can contain:
//
//     + notCovered: An optional boolean; if true, then this service isn't covered by the plan.
//         If this is present and true, all other properties below will be summarily ignored.
//     + copay: An optional amount specified in dollars, e.g. 25.00.  If undefined, disables copay
//         portion of calculation.
//     + coinsurance: An optional amount specified as a percentage, e.g. 0.10 = 10%.  If undefined,
//         disables coinsurance portion of calculation.
//     + deductible: An optional string being one of "none", "beforeCopay", "afterCopay", and
//         "beforeCoinsurance".  Note that "afterCopay" and "beforeCoinsurance" are synonymous, implying
//         the same position of deduction calculation in the engine.  But, use whatever name is appropriate
//         for the type of coverage.  If this property is undefined, it defaults to "afterCopay" /
//         "beforeCoinsurance", which is the most likely situation.
//     + copayNotTowardsOOPMax: a boolean, which defaults to false if undefined.  When present as true,
//         the copay amount will not count towards the out of pocket maximums, and even if out of pocket
//         maximums have been met, the copay must still be paid.
//     + coveredCount: a number, which defaults to Infinity if undefined.  When present, any visits that
//         exceed the coveredCount will be considered not covered, but may flow to a subsequent coverage
//         object, if an array of coverage objects is being used.
//     + dollarLimit: a number, which is ignored if undefined.  Can be present instead of coveredCount
//         to indicate the coverage of a service applies up to the specified dollar limit.  After the
//         dollar limit, the excess will be considered not covered, but may flow to a subsequent coverage
//         object, if an array of coverage objects is being used. Note: Either coveredCount OR dollarLimit
//         (not both) can be specified on a coverage object.  Also note: dollarLimit does not currently
//         support copay; it can only be used with coinsurance type coverage.
//     + coinsuranceNotTowardsOOPMax: a boolean, which defaults to false if undefined.  When present as
//         true, the coinsurance amount will not count towards the out of pocket maximums, and even if out
//         of pocket maximums have been met, the coinsurance must still be paid.
//     + coinsuranceMinDollar: an optional number, which defaults to negative Infinity if undefined.
//     + coinsuranceMaxDollar: an optional number, which defaults to Infinity if undefined.
//     + singleUseCostMax: an optional number, which defaults to Infinity if undefined.  This value
//         limits the maximum cost to the individual for a single instance of the service, whether the
//         cost arises from copay, deductible, or coinsurance or any combination thereof.
//     + combinedLimitId: an optional string, which if present also ties coverage of the service to a
//         combined reimbursement limit as defined by this.combinedLimits. If combinedLimitId is
//         present, then the coverage object should not be part of a coverage object array. Costs beyond
//         a combined reimbursement limit are always considered not covered by a plan.
//
//     * If the coverage object is an array, then it can contain multiple individual coverage objects.  This
//     is to handle some special cases where a certain copay or coinsurance amount applies to the first N
//     visits, with another amount applying to the next M visits, etc.  In such a case, each coverage
//     object in a coverage array will be applied in turn, to the specified coveredCount, reducing
//     the number of visits on each individual coverage object.
//
this.services =
{
	//------------------------------
	// outpatient services
	//------------------------------

	"routinePhysical18Plus":
	{
		description: "Routine physical (ages 18 and over)",
		costs: { "AZ": 100.20, "CA": 237.73, "NE": 194.89, "UT": 139.88, "OTHER_LOCATIONS": 139.88 },
		coverage:
		{
			"PPO_300": { copay: 0, deductible: "none" },
			"CDHP": { copay: 0, deductible: "none" },
			"HMO_CA": { copay: 0, deductible: "none" },
			"HMO_AZ": { copay: 0, deductible: "none" },
			"HMO_UT": { copay: 0, deductible: "none" }
		}
	},

	"primaryCarePhysician":
	{
		description: "Primary Care Physician",
		costs: { "AZ": 135.78, "CA": 257.24, "NE": 209.53, "UT": 162.25, "OTHER_LOCATIONS": 162.25 },
		coverage:
		{
			"PPO_300": { copay: 20, deductible: "none" },
			"CDHP": { coinsurance: 0.10 },
			"HMO_CA": { copay: 20, deductible: "none" },
			"HMO_AZ": { copay: 20, deductible: "none" },
			"HMO_UT": { copay: 20, deductible: "none" }
		}
	},

	"specialistOfficeVisit":
	{
		description: "Specialist office visit",
		costs: { "AZ": 169.76, "CA": 226.22, "NE": 187.49, "UT": 171.21, "OTHER_LOCATIONS": 171.21 },
		coverage:
		{
			"PPO_300": { copay: 35, deductible: "none" },
			"CDHP": { coinsurance: 0.10 },
			"HMO_CA": { copay: 35, deductible: "none" },
			"HMO_AZ": { copay: 35, deductible: "none" },
			"HMO_UT": { copay: 35, deductible: "none" }
		}
	},

	"xray":
	{
		description: "X-ray",
		costs: { "AZ": 938.12, "CA": 1025.55, "NE": 442.67, "UT": 535.43, "OTHER_LOCATIONS": 535.43 },
		coverage:
		{
			"PPO_300": { coinsurance: 0.10 },
			"CDHP": { coinsurance: 0.10 },
			"HMO_CA": { copay: 0, deductible: "none" },
			"HMO_AZ": { copay: 0, deductible: "none" },
			"HMO_UT": { copay: 0, deductible: "none" }
		}
	},
	
	"lab":
	{
		description: "Outpatient Lab",
		costs: { "AZ": 126.11, "CA": 245.60, "NE": 128.39, "UT": 129.25, "OTHER_LOCATIONS": 129.25 },
		coverage:
		{
			"PPO_300": { coinsurance: 0.10 },
			"CDHP": { coinsurance: 0.10 },
			"HMO_CA": { copay: 0, deductible: "none" },
			"HMO_AZ": { copay: 0, deductible: "none" },
			"HMO_UT": { copay: 0, deductible: "none" }
		}
	},
	
	"urgentCareVisit":
	{
		description: "Urgent care visit",
		costs: { "AZ": 137.68, "CA": 235.70, "NE": 181.64, "UT": 164.31, "OTHER_LOCATIONS": 164.31 },
		coverage:
		{
			"PPO_300": { copay: 35, deductible: "none" },
			"CDHP": { coinsurance: 0.10 },
			"HMO_CA": { copay: 20, deductible: "none" },
			"HMO_AZ": { copay: 50, deductible: "none" },
			"HMO_UT": { copay: 35, deductible: "none" }
		}
	},

	"emergencyRoomVisit":
	{
		description: "Emergency room visit",
		costs: { "AZ": 1640.96, "CA": 3341.92, "NE": 1417.89, "UT": 1636.57, "OTHER_LOCATIONS": 1636.57 },
		coverage:
		{
			"PPO_300": { copay: 100, deductible: "afterCopay", coinsurance: 0.10 },
			"CDHP": { coinsurance: 0.10 },
			"HMO_CA": { copay: 100, deductible: "none" },
			"HMO_AZ": { copay: 100, deductible: "none" },
			"HMO_UT": { copay: 100 }
		}
	},
	
	"outpatientSurgery":
	{
		description: "Outpatient surgery",
		costs: { "AZ": 3630.55, "CA": 6302.59, "NE": 6661.46, "UT": 4724.73, "OTHER_LOCATIONS": 4724.73 },
		coverage:
		{
			"PPO_300": { coinsurance: 0.10 },
			"CDHP": { coinsurance: 0.10 },
			"HMO_CA": { copay: 100, deductible: "none" },
			"HMO_AZ": { copay: 50, deductible: "none" },
			"HMO_UT": { copay: 35 }
		}
	},

	//------------------------------
	// inpatient services
	//------------------------------

	"other2DayInpatientFacCharges":
	{
		description: "Inpatient facility charges",
		costs: { "AZ": 12122.72, "CA": 18100.72, "NE": 8724.39, "UT": 8861.33, "OTHER_LOCATIONS": 8861.33 },
		coverage:
		{
			"PPO_300": { copay: 250, deductible: "none", coinsurance: 0.10 },
			"CDHP": { coinsurance: 0.10 },
			"HMO_CA": { copay: 250, deductible: "none" },
			"HMO_AZ": { copay: 250, deductible: "none" },
			"HMO_UT": { copay: 250 }
		}
	},

	//------------------------------
	// drug services (regular)
	//------------------------------

	"drugsRetailGeneric30DaySupply":
	{
		description: "Retail&mdash;generic (30-day supply)",
		costs: { "AZ": 32, "CA": 25.28, "NE": 25.98, "UT": 30.48, "OTHER_LOCATIONS": 30.48 },
		coverage:
		{
			"PPO_300": { copay: 10, deductible: "none" },
			"CDHP": { coinsurance: 0.10 },
			"HMO_CA": { copay: 10, deductible: "none" },
			"HMO_AZ": { copay: 10, deductible: "none" },
			"HMO_UT": { copay: 10, deductible: "none" }
		}
	},

	"drugsRetailPref30DaySupply":
	{
		description: "Retail&mdash;Primary Drug List (30-day supply)",
		costs: { "AZ": 302.23, "CA": 255.89, "NE": 305.57, "UT": 281.59, "OTHER_LOCATIONS": 281.59 },
		coverage:
		{
			"PPO_300": { copay: 25, deductible: "none" },
			"CDHP": { coinsurance: 0.10 },
			"HMO_CA": { copay: 25, deductible: "none" },
			"HMO_AZ": { copay: 25, deductible: "none" },
			"HMO_UT": { copay: 25, deductible: "none" }
		}
	},

	"drugsMailGeneric90DaySupply":
	{
		description: "Mail order&mdash;generic (90-day supply)",
		costs: { "AZ": 95.19, "CA": 78.41, "NE": 54.07, "UT": 53.97, "OTHER_LOCATIONS": 53.97 },
		coverage:
		{
			"PPO_300": { copay: 20, deductible: "none" },
			"CDHP": { coinsurance: 0.10 },
			"HMO_CA": { copay: 20, deductible: "none" },
			"HMO_AZ": { copay: 20, deductible: "none" },
			"HMO_UT": { copay: 10, deductible: "none" }
		}
	},

	"drugsMailPref90DaySupply":
	{
		description: "Mail order&mdash;Primary Drug List (90-day supply)",
		costs: { "AZ": 623.51, "CA": 376.99, "NE": 629.88, "UT": 654.98, "OTHER_LOCATIONS": 654.98 },
		coverage:
		{
			"PPO_300": { copay: 50, deductible: "none" },
			"CDHP": { coinsurance: 0.10 },
			"HMO_CA": { copay: 50, deductible: "none" },
			"HMO_AZ": { copay: 50, deductible: "none" },
			"HMO_UT": { copay: 50, deductible: "none" }
		}
	}
};

//-------------------------------------------------------------------------------------------------
// combinedLimits: An optional object defining combined reimbursement limits. A
//    combined reimbursement limit sets a maximum dollar amount that can be reimbursed for a
//    combination of services, either per person or per family or both. The service coverage
//    objects (above) that are related to a single combined reimbursement limit should refer
//    to the same combinedLimitId.
//
// Structure: Object mapping combined limit ids, each to an object containing properties as follows:
//
// - personReimburseLimit: Optional maximum dollar amount that will be reimbursed by the plan, per
//     person, for the set of services tied to the combined limit.
// - familyReimburseLimit: Optional maximum dollar amount that will be reimursed by the plan, per
//     family, for the set of services tied to the combined limit.
//
//   Note: It is possible to use either reimburse limit above alone or in conjunction. For instance,
//   you could, say, restrict a given service to $300 per person and a total of $750 per family.
//
this.combinedLimits =
{
};

//-------------------------------------------------------------------------------------------------
// categories: Categories exist both to provide a way to group services for display,
//    as well as to customize certain MPCE calculation behaviour -- e.g. fund amounts,
//    deductible, and out-of-pocket maximums on a category basis.
//
// Structure: Object mapping category ids, each to an object containing properties as follows:
//
// - description: Required string property containing the category name suitable for display.
// - orderedContents: Required array containing service ids, in the order suitable for display
//     and to be iterated over.  Each of the services ids referred to must be defined in
//     this.services.  Every service id must appear in one and only one category.
//
this.categories =
{
	"outpatient":
	{
		description: "Outpatient Care",
		orderedContents:
		[
			"routinePhysical18Plus",
			"primaryCarePhysician",
			"specialistOfficeVisit",
			"xray",
			"lab",
			"urgentCareVisit",
			"emergencyRoomVisit",
			"outpatientSurgery"
		]
	},

	"inpatient":
	{
		description: "Inpatient Care",
		orderedContents:
		[
			"other2DayInpatientFacCharges"
		]
	},

	"drugs":
	{
		description: "Prescription Drugs",
		orderedContents:
		[
			"drugsRetailGeneric30DaySupply",
			"drugsRetailPref30DaySupply",
			"drugsMailGeneric90DaySupply",
			"drugsMailPref90DaySupply"
		]
	}

};

//-------------------------------------------------------------------------------------------------
// categoriesOrder: An array defining the order in which categories are to be
//     displayed and/or iterated over.  The set of category ids here must match exactly the set of
//     category ids defined in this.categories above.
//
this.categoriesOrder = ["outpatient", "inpatient", "drugs"];

//-------------------------------------------------------------------------------------------------
// healthStatuses: Health statuses are optional groupings of different health services
//     and counts.  Essentially, a health status provides a shortcut way for a user to select a
//     group of services for estimation based on simple criteria like low / medium / high etc.
//
// Structure: Object mapping health status ids, each to an object containing properties as follows:
//
// - description: Required string property containing the health status name suitable for display.
// - contents: Required object mapping individual service ids to a service count.  Each of the
//     services ids referred to must be defined in this.services.
//
this.healthStatuses =
{
	"low":
	{
		description: "Low",
		contents:
		{
			"routinePhysical18Plus": 1,
			"primaryCarePhysician": 1,
			"specialistOfficeVisit": 1,
			"lab": 1,
			"drugsRetailGeneric30DaySupply": 4
		}
	},

	"medium":
	{
		description: "Medium",
		contents:
		{
			"routinePhysical18Plus": 1,
			"primaryCarePhysician": 3,
			"specialistOfficeVisit": 2,
			"xray": 1,
			"lab": 1,
			"urgentCareVisit": 1,
			"emergencyRoomVisit": 1,
			"drugsRetailGeneric30DaySupply": 4,
			"drugsRetailPref30DaySupply": 1,
			"drugsMailGeneric90DaySupply": 4
		}
	},

	"high":
	{
		description: "High",
		contents:
		{
			"primaryCarePhysician": 4,
			"specialistOfficeVisit": 4,
			"xray": 3,
			"lab": 3,
			"outpatientSurgery": 1,
			"urgentCareVisit": 1,
			"emergencyRoomVisit": 2,
			"other2DayInpatientFacCharges": 1,
			"drugsRetailGeneric30DaySupply": 4,
			"drugsRetailPref30DaySupply": 2,
			"drugsMailGeneric90DaySupply": 8,
			"drugsMailPref90DaySupply": 4
		}
	}
};

//-------------------------------------------------------------------------------------------------
// healthStatusesOrder: An array defining the order in which health statuses are to be
//     displayed and/or iterated over.  The set of health status ids here must match exactly the
//     set of health status ids defined in this.healthStatuses above.
//
this.healthStatusesOrder = ["low", "medium", "high"];

this._defined = true;
};

MPCE_CONFIG._definition(); // invoke above definition function
