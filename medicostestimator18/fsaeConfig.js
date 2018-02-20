//-------------------------------------------------------------------------------------------------
// fsaeConfig.js
//
// Copyright (C) 2017 Mercer LLC, All Rights Reserved.
//
// This file contains the configuration for a given Flexible Spending Account Estimator (FSAE).
// This configuration is intended to contain client-specific customization to drive the generic
// FSAE engine in a data-driven fashion, permitting it to be maintained as common across clients.
// Briefly, the FSAE configuration object describes:
//
//     * ACCOUNT TYPES, e.g. flexible spending accounts (FSA) vs. health savings accounts (HSA).
//     * FEDERAL INCOME TAX, including tax brackets, rates, and some exemptions/deductions.
//     * FICA PAYROLL TAXES, including Social Security limit and rate and Medicare rate.
//
// For more detail, please refer to the sections below.
//

//-------------------------------------------------------------------------------------------------
// jslint options.  See http://www.jslint.com
/*jslint white:true, nomen:true, continue:true, plusplus:true, sloppy:true */

// Everything in this file hangs off the following object, so we don't litter the global namespace.
var FSAE_CONFIG = {};
FSAE_CONFIG._definition = function() { // IMPORTANT: Gets called at end of the file.
"use strict";
if (this._defined) { return; }

//-------------------------------------------------------------------------------------------------
// accountTypes: Defines the different account types that can be modeled by the FSAE.
//
// Structure: Object mapping string account type ids, each to an object containing properties
//     as follows:
//
// - description: Required string property containing the account type name suitable for display.
// - contributionMinimum: Optional number property indicating the minimum contribution amount for
//     the account type. If not specified, zero is assumed.
// - contributionMaximum: Optional number property indicating the maximum contribution amount for
//     the account type. If not specified, Infinity is assumed.
// - rolloverPermitted: Optional boolean property indicating whether the account type permits
//     rollover from previous years unused balance, or not. This drives only UI logic; the engine
//     always permits a rollover value to be passed.
// - employerMatchRate: Optional number property indicating the rate of employer matching
//     contributions. If not specified, zero is assumed.
// - employerMaxMatchAmount: Optional number property indicating the maximum dollar amount of
//      employer matching provided.  i.e. Limits the money from employerMatchRate.  If not
//      specified, Infinity is assumed.
//
this.accountTypes =
{
	// The "FSA" plan configured here is used by FsaeFlex.swf.
	"FSA":
	{
		description: "Flexible Spending Account (FSA) Estimator",
		rolloverPermitted: false,
		contributionMinimum: 0,
		contributionMaximum: 2600
	},
	
	// The "HSA" plan configured here is used by HsaeFlex.swf.
	"HSA":
	{
		description: "HSA and Limited-Purpose FSA Estimator",
		rolloverPermitted: false,
		contributionMinimum: 0,
		contributionMaximum: 6900
	},
	
	// The "LPFSA" plan configured here is ALSO used by HsaeFlex.swf.
	"LPFSA":
	{
		description: "HSA and Limited-Purpose FSA Estimator (LPFSA part)",
		rolloverPermitted: false,
		contributionMinimum: 0,
		contributionMaximum: 2600
	}
};

//-------------------------------------------------------------------------------------------------
// accountTypesOrder: An array defining the order in which account types are to be
//     displayed and/or iterated over.  The set of account type ids here must match exactly the
//     set of account type ids defined in this.accountTypes.
//
this.accountTypesOrder = ["FSA", "HSA", "LPFSA"];

//-------------------------------------------------------------------------------------------------
// federalIncomeTax: Defines the different values required for the federal income tax
//   estimate calculation.
//
// Structure: An object containing properties as follows:
//
// - brackets: Required object mapping filing type ids (see below*) to an array containing numbers, each
//     of which is the upper limit for the income tax bracket.
// - rates: Required object mapping filing type ids (see below*) to an array containing numbers, each of
//     which is the tax rate effective at the corresponding bracket (and below). The final rate
//     in the array should be the rate for income in excess of the last corresponding bracket.
// - standardDeductions: Required object mapping filing type ids (see below*) to numbers for the
//     standard deduction amount for that filing type.
// - personalExemptions: Required object mapping filing type ids (see below*) to numbers for the
//     standard personal exemption amount for that filing type.
// - dependentExemption: Required number for the additional exemption amount per dependent.
//
// * The required filing type ids are "single", "marriedFilingJoint", "marriedFilingSeparate", and
// "headOfHousehold".
//
this.federalIncomeTax =
{
	// Values current as of: 2017

    brackets:
    {
        single: [9325, 37950, 91900, 191650, 416700, 418400],
        marriedFilingJoint: [18650, 75900, 153100, 233350, 416700, 470700],
        marriedFilingSeparate: [9325, 37950, 76550, 116675, 208350, 235350],
        headOfHousehold: [13350, 50800, 131200, 212500, 416700, 444550]
    },

    rates:
    {
        // Rates are currently identical across filing types.
        single: [0.10, 0.15, 0.25, 0.28, 0.33, 0.35, 0.396],
        marriedFilingJoint: [0.10, 0.15, 0.25, 0.28, 0.33, 0.35, 0.396],
        marriedFilingSeparate: [0.10, 0.15, 0.25, 0.28, 0.33, 0.35, 0.396],
        headOfHousehold: [0.10, 0.15, 0.25, 0.28, 0.33, 0.35, 0.396]
    },

    standardDeductions:
    {
        single: 6350,
        marriedFilingJoint: 12700,
        marriedFilingSeparate: 6350,
        headOfHousehold: 9350
    },

    personalExemptions:
    {
        single: 4050,
        marriedFilingJoint: 8100,
        marriedFilingSeparate: 4050,
        headOfHousehold: 4050
    },

    dependentExemption: 4050
};

//-------------------------------------------------------------------------------------------------
// ficaPayrollTaxes: Defines the different values required for the FICA payroll taxes
//   estimate calculation.
//
// Structure: An object containing properties as follows:
//
// - socialSecurityLimit: Required number for the current Social Security income limit;
//     i.e. the income amount beyond which Social Security deductions are not required.
// - socialSecurityRate: Required number property for the employee's Social Security tax rate.
// - medicareRate: Required number property for the employee's Medicare payroll tax rate.
//
this.ficaPayrollTaxes =
{
	// Values current as of: 2017

    socialSecurityLimit: 118500,
    socialSecurityRate: 0.062,
    medicareRate: 0.0145
};

this._defined = true;
};

FSAE_CONFIG._definition(); // invoke above definition function
