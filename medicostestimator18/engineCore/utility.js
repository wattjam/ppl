//-------------------------------------------------------------------------------------------------
// utility.js
//
// Copyright (C) 2015 Mercer LLC, All Rights Reserved.
//
// Provides additional general-purpose extensions and functions.
//

//-------------------------------------------------------------------------------------------------
// jslint options.  See http://www.jslint.com
/*jslint white:true, nomen:true, continue:true, plusplus:true, sloppy:true, browser:true */

if (typeof (Object.create) !== 'function') // extension method guard
{
	Object.create = function (obj) {
		///	<summary>
		///	Object.create() static extension method.  Implements prototypal construction.
		/// See http://javascript.crockford.com/prototypal.html. Available in ECMAScript 5,
		/// but included here for downlevel consumers.
		///	</summary>
		///	<param name="format" type="obj">The object to copy.</param>
		///	<returns type="Object">Another object instance, having obj as its prototype.</returns>
		var F = function () { }; //  jslint warns here. acknowledged.
		F.prototype = obj;
		return new F();
	};
}

if (typeof (String.format) !== 'function') // extension method guard
{
	String.format = function (fmt) {
		///	<summary>
		///	String.format() static extension method. Like C#'s string.Format() that can accept positional
		/// arguments.  Unlike C# in that it doesn't provide formatting of those individual arguments.
		///	</summary>
		///	<param name="format" type="String">The format string.  Optional format specifiers such as
		///   {0}, {1}, etc. may be included, and additional arguments will be substituted accordingly.
		/// </param>
		///	<returns type="String">The format string after substituting positional arguments.</returns>

		var i, exp, result;
		result = fmt;
		for (i = 1; i < arguments.length; i++) {
			exp = new RegExp('\\{' + (i - 1) + '\\}', 'gm');
			result = result.replace(exp, arguments[i]);
		}
		return result;
	};
}

if (typeof (String.padLeft) !== 'function') // extension method guard
{
	String.padLeft = function (val, width) {
		///	<summary>
		///	String.padLeft() static extension method.  Pads the left of a string to a minimum width.
		///	</summary>
		///	<param name="val" type="String">The string to pad with spaces, to the desired minimum width.</param>
		///	<param name="width" type="Number">The desired minimum width.</param>
		///	<returns type="String">The padded string, or the original if the minimum width was already met.</returns>

		var str, numSpacesNeeded, padding, result;
		str = (typeof val === "string") ? val : val.toString();
		numSpacesNeeded = Math.max(0, width - str.length);
		padding = (numSpacesNeeded > 0) ? (Array.prototype.constructor(numSpacesNeeded + 1).join(" ")) : "";
		result = padding + str;
		return result;
	};
}

if (typeof (Math.min3) !== 'function') // extension method guard
{
	Math.min3 = function (a, b, c) {
		///	<summary>
		///	Math.min3() static extension method.  Returns the minimum of three numbers.
		///	</summary>
		///	<param name="a" type="Number">The first number.</param>
		///	<param name="b" type="Number">The second number.</param>
		///	<param name="c" type="Number">The third number.</param>
		///	<returns type="Number">The minimum of a, b, and c.</returns>

		var result;
		result = Math.min(Math.min(a, b), c);
		return result;
	};
}

var formatDollar = function (amount, includeCents, excludeSign) {
	///	<summary>
	///	Formats a number as a dollar amount string with comma thousands separator and optional cents.
	/// Note: Doesn't round, just formats.  (Round in advance if needed.)
	///	</summary>
	///	<param name="amount" type="Number">The number to format as a dollar amount.</param>
	///	<param name="includeCents" type="Boolean">A boolean indicating whether to include cents, or not.</param>
	///	<param name="excludeSign" type="Number">A boolean indicating whether to exclude the $ sign, or not.</param>
	///	<returns type="String">The formatted dollar amount.</returns>

	var negative, parts, whole, wholeWithCommas, i, count, dimes, cents, result;
	amount = amount.toFixed(2); // Convert to string in fixed format (no exponent part)
	negative = amount < 0;
	amount = Math.abs(amount);
	if (!includeCents) {
		amount = Math.round(amount);
	}
	parts = amount.toString().split(".");
	whole = parts[0];
	wholeWithCommas = "";
	for (i = whole.length - 1, count = 1; i >= 0; --i, ++count) {
		wholeWithCommas = whole.charAt(i) + wholeWithCommas;
		if (0 === (count % 3) && (i !== 0)) {
			wholeWithCommas = "," + wholeWithCommas;
		}
	}
	dimes = (parts[1] || "00").charAt(0);
	cents = (parts[1] || "00").charAt(1) || "0";
	result = (negative ? "-" : "") + (excludeSign ? "" : "$") +
		wholeWithCommas + (includeCents ? ("." + dimes + cents) : "");
	return result;
};

var isArray = function (value) {
	///	<summary>
	///	Returns true if the value passed is a plain JavaScript array, false otherwise.
	///	</summary>
	///	<param name="value" type="Object">The object to test for array-ness.</param>
	///	<returns type="Boolean">True if the value passed is a plain JavaScript array, false otherwise.</returns>

	var result;
	result = Object.prototype.toString.apply(value) === '[object Array]';
	return result;
};

var isNullOrUndefined = function (value) {
	///	<summary>
	///	Returns true if the value passed is a strictly null or strictly undefined object, false otherwise.
	///	</summary>
	///	<param name="value" type="Object">The object to test for null or undefined.</param>
	///	<returns type="Boolean">True if the value passed is a strictly null or strictly undefined object,
	/// false otherwise.</returns>

	var result = false;
	if (value === undefined || value === null) {
		result = true;
	}
	return result;
};

function setSessionCookie(name, value) {
	///	<summary>
	/// Saves a string value as a session cookie; i.e. goes away when the browser is closed.
	///	</summary>
	///	<param name="name" type="String">The name of the cookie to save.</param>
	///	<param name="value" type="String">The value of the cookie to save.</param>

	document.cookie = name + "=" + encodeURIComponent(value); // Note: no "expires" = session cookie.
}

function getCookie(name) {
	///	<summary>
	///	Returns the named cookie value or undefined if there's no such cookie.
	///	</summary>
	///	<param name="name" type="String">The name of the cookie to retrieve.</param>
	///	<returns type="String">The named cookie value, or undefined if there's no such cookie.</returns>

	var result, cookies = document.cookie.split("; "), i, parts;
	for (i = 0; i < cookies.length; ++i) {
		parts = cookies[i].split("=");
		if (name === parts[0]) {
			result = decodeURIComponent(parts[1]);
			break;
		}
	}
	return result;
}

function descriptionHelper(obj, langCode) {
	///	<summary>
	/// Helper to get an object's "description" property, whether it is a string, or an object
	/// mapping language codes to strings.
	///	</summary>
	///	<param name="obj" type="Object">The object for which the description is desired.</param>
	///	<param name="langCode" type="String">The language code, e.g. "EN".</param>
	///	<returns type="String">If the "description" property of the passed-in object is a string, then
	/// returns as-is. If the property is instead an object, then the corresponding string contained in
	/// that object is returned, or the first found, if that key isn't present.
	/// </returns>
	if (langCode === undefined) {
		langCode = "EN"; // default
	}
	if (isNullOrUndefined(obj)) {
		return "[invalid object]";
	}
	if (obj.description) {
		switch (typeof obj.description) {
			case "string":
				return obj.description;
			case "object":
				return obj.description[langCode] || obj.description[Object.keys(obj.description)[0]];
			default:
				return obj.description.toString();
		}
	}
	return obj.toString();
}
