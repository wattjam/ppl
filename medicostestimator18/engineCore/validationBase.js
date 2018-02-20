//-------------------------------------------------------------------------------------------------
// validationBase.js
//
// Copyright (C) 2015 Mercer LLC, All Rights Reserved.
//
// Contains the VALIDATION_BASE object defining functionality common to both MPCE_VALIDATION
// (see mpceValidation.js) and FSAE_VALIDATION (see fsaeValidation.js).
//

//-------------------------------------------------------------------------------------------------
// Declare other referenced JS files to enable Visual Studio IntelliSense.
/// <reference path="~/js/engineCore/utility.js" />

//-------------------------------------------------------------------------------------------------
// jslint options.  See http://www.jslint.com
/*jslint white:true, nomen:true, continue:true, plusplus:true, sloppy:true */
/*global isArray, isNullOrUndefined */

// Everything in this file hangs off the following object, so we don't litter the global namespace.
var VALIDATION_BASE = {};
VALIDATION_BASE._definition = function() { // IMPORTANT: Gets called at end of the file.
"use strict";
if (this._defined) { return; }

this.clearErrors = function()
{
	///	<summary>
	/// Clears the errors property to an empty array.
	///	</summary>
	///	<returns type="undefined"></returns>

	this.errors = [];
};

this.addError = function()
{
	///	<summary>
	///	Adds an error string to the list of errors.  Accepts a format string and variable arguments.
	///	</summary>
	///	<param name="format" type="String">The format string.  Optional format specifiers such as
	///    {0}, {1}, etc. may be included, and additional arguments will be substituted accordingly.
	/// </param>
	var formattedError = String.format.apply(null, arguments);
	this.errors.push(formattedError);
};

this.checkType = function (value, valueName, typeNameOrNames)
{
	///	<summary>
	///	Helper providing common implementation part for checkRequiredType() and checkOptionalType().
	///	</summary>
	/// <param name="value" type="Object">The value to check.</param>
	/// <param name="valueName" type="Object">The value name to emit in any error message.</param>
	/// <param name="typeNameOrNames" type="Object">The type name or names to look for in typeof(value)
	///    A string can be passed for a single name, or an array for multiple names.</param>
	///	<returns type="Boolean">True if the checks passed, false otherwise.</returns>

	var initialErrorCount = this.errors.length, success, typeNames, isMultiple, errorMessage, matchedOne, i, typeName;
	typeNames = isArray(typeNameOrNames) ? typeNameOrNames : [typeNameOrNames];
	isMultiple = (typeNames.length > 1);
	matchedOne = false;
	for (i = 0; i < typeNames.length; ++i)
	{
		typeName = typeNames[i];
		if (typeName === "array")
		{
			matchedOne = isArray(value);
		}
		else if (typeName === "object")
		{
			matchedOne = (typeof value === "object") && !isArray(value);
		}
		else
		{
			matchedOne = (typeof value === typeName); //  jslint warns here. acknowledged.
		}
		if (matchedOne)
		{
			break;
		}
	}
	if (!matchedOne)
	{
		errorMessage = String.format('{0} must be{1} of {2} {3}.',
			valueName, isMultiple ? " one" : "", isMultiple ? "the following types:" : "type", typeNames.join(", "));
		this.addError(errorMessage);
	}
	success = (initialErrorCount === this.errors.length);
	return success;
};

this.checkRequiredType = function (value, valueName, typeNameOrNames)
{
	///	<summary>
	///	Checks that the value is not null or undefined and it has typeof matching one of typeNameOrNames,
	/// which can be either a single string or an array of strings.  If it is null or undefined or doesn't
	/// match one of the types, it appends an error and returns false.  Special case: Pass "array" to test
	/// for array specifically; arrays won't match for "object".
	///	</summary>
	/// <param name="value" type="Object">The value to check.</param>
	/// <param name="valueName" type="Object">The value name to emit in any error message.</param>
	/// <param name="typeNameOrNames" type="Object">The type name or names to look for in typeof(value)
	///    A string can be passed for a single name, or an array for multiple names.</param>
	///	<returns type="Boolean">True if the checks passed, false otherwise.</returns>

	var initialErrorCount = this.errors.length, success;
	if (isNullOrUndefined(value))
	{
		this.addError('{0} is required.', valueName);
	}
	else
	{
		this.checkType(value, valueName, typeNameOrNames);
	}
	success = (initialErrorCount === this.errors.length);
	return success;
};

this.checkOptionalType = function (value, valueName, typeNameOrNames)
{
	///	<summary>
	///	Checks that if the value is not null or undefined, then it has typeof matching one of
	/// typeNameOrNames, which can be either a single string or an array of strings.  If it doesn't match
	/// one of the types, it appends an error and returns false.  Special case: Pass "array" to test for
	/// array specifically; arrays won't match for "object".
	///	</summary>
	/// <param name="value" type="Object">The value to check.</param>
	/// <param name="valueName" type="Object">The value name to emit in any error message.</param>
	/// <param name="typeNameOrNames" type="Object">The type name or names to look for in typeof value
	///    A string can be passed for a single name, or an array for multiple names.</param>
	///	<returns type="Boolean">True if the checks passed, false otherwise.</returns>

	var initialErrorCount = this.errors.length, success;
	if (!isNullOrUndefined(value))
	{
		this.checkType(value, valueName, typeNameOrNames);
	}
	success = (initialErrorCount === this.errors.length);
	return success;
};

this.checkObjectAndOrderContentsMatch = function (objName, obj, orderArrayName, orderArray)
{
	///	<summary>
	///	Ensures that a given object and its associated order array have matching contents; that is,
	/// that every named inner object is present in the order array, and vice-versa.
	///	</summary>
	///	<param name="objName" type="String">The name or description of the object that follows, for
	///     troubleshooting.</param>
	///	<param name="obj" type="Object">The object to check.</param>
	///	<param name="orderArrayName" type="String">The name or description of the array that follows, for
	///     troubleshooting.</param>
	///	<param name="orderArray" type="Array">The order array to check.</param>
	///	<returns type="Boolean">True if the checks passed, false otherwise.</returns>

	var initialErrorCount = this.errors.length, success, i, id, contents = {};

	this.checkRequiredType(obj, objName, "object");
	this.checkRequiredType(orderArray, orderArrayName, "array");
	if (initialErrorCount !== this.errors.length)
	{
		return false;
	}

	// Walk orderArray and add the ids the temporary object "contents"
	for (i = 0; i < orderArray.length; ++i)
	{
		id = orderArray[i];
		if (typeof id !== "string")
		{
			this.addError('{0} must contain only string id values.', orderArrayName);
			continue;
		}
		if (contents[id] !== undefined)
		{
			this.addError('{0} refers to "{1}" more than once.', orderArrayName, id);
			continue;
		}
		contents[id] = true;
	}
	// Iterate through projerties in obj, removing them from "contents" if found, complaining if not found.
	for (id in obj)
	{
		if (obj.hasOwnProperty(id))
		{
			if (contents.hasOwnProperty(id))
			{
				delete contents[id];
			}
			else
			{
				this.addError('{0} contains id "{1}" not found in {2}.', objName, id, orderArrayName);
			}
		}
	}
	// Last, complain about whatever that's still in contents; it was in the orderArray but not in obj.
	for (id in contents)
	{
		if (contents.hasOwnProperty(id))
		{
			this.addError('{0} refers to "{1}" not found in {2}.', orderArrayName, id, objName);
		}
	}
	success = (initialErrorCount === this.errors.length);
	return success;
};

this.throwIfErrorsExist = function ()
{
	///	<summary>
	/// If the errors array property has any errors, they are reduced to a sorted unique set, an error
	/// message constructed, and an exception thrown.  Otherwise, if there are no errors, nothing happens.
	///	</summary>
	///	<returns type="undefined"></returns>

	var uniqueErrors = [], i, current, previous = "", joinedErrors;

	if (this.errors.length > 0)
	{
		// Sort and remove duplicates.
		uniqueErrors = [];
		this.errors.sort();
		for (i = 0; i < this.errors.length; ++i)
		{
			current = this.errors[i];
			if (current !== previous)
			{
				uniqueErrors.push(current);
			}
			previous = current;
		}
		joinedErrors = uniqueErrors.join("\n");
		this.clearErrors();
		throw new Error("The following configuration errors were found:\n\n" + joinedErrors + "\n\n");
	}
};

this._defined = true;
};

VALIDATION_BASE._definition(); // invoke above definition function
