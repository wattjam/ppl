//-------------------------------------------------------------------------------------------------
// trace.js
//
// Copyright (C) 2015 Mercer LLC, All Rights Reserved.
//
// Provides trace functionality for debugging.  Trace information can be displayed by creating an
// HTML text area with the appropriate id (see below).  If no such text area exists, trace is
// effectively disabled.
//

//-------------------------------------------------------------------------------------------------
// jslint options.  See http://www.jslint.com
/*jslint browser: true, plusplus: true, white: true, continue: true, nomen: true */
/*global console */

var TRACE = {}; // namespace
TRACE._definition = function () { // IMPORTANT: Gets called at end of the file.
	"use strict";
	if (this._defined) { return; }

	this._traceOutputTextAreaId = "traceOutputTextArea";
	this._traceOutputTextArea = null;
	this._traceOutputTextAreaLogging = false;
	this._consoleLogging = false;
	this._initialized = false;
	this.on = false;

	this.clear = function () {
		///	<summary>
		///	Clears the trace output text area.
		///	</summary>
		///	<returns type="undefined"></returns>

		if (!this._initialized) { this._maybeInitialize(); }
		if (!this.on) { return; }
		if (this._traceOutputTextAreaLogging) { this._traceOutputTextArea.value = ""; }
		if (this._consoleLogging && typeof (console.clear) === "function") { console.clear(); }
	};

	this.writeLine = function (format) {
		///	<summary>
		///	Writes out a string to the trace output, with optional format specifiers substituted.
		/// An implied newline is output after the formatted trace message.
		///	</summary>
		///	<param name="format" type="String">The format of the trace message to output, or nothing	
		///   if just a newline is desired. Optional format specifiers such as {0}, {1}, etc. may be
		///   included, and additional arguments will be substituted accordingly.
		/// </param>
		///	<returns type="undefined"></returns>

		var argsClone, i;

		if (!this._initialized) { this._maybeInitialize(); }
		if (!this.on) { return; }
		if (this._traceOutputTextAreaLogging || this._consoleLogging) {
			if (format !== undefined) {
				argsClone = [];
				for (i = 0; i < arguments.length; ++i) {
					argsClone.push(arguments[i]);
				}
				this._writeLineImpl.apply(this, argsClone);
			} else {
				this._writeLineImpl("");
			}
		}
	};

	this.enableConsoleLogging = function () {
		///	<summary>
		///	Enables console logging using the JavaScript console.log() method, if present.
		/// By default, console logging is off.
		///	</summary>
		///	<returns type="undefined"></returns>

		if (console !== undefined && typeof (console.log) === "function") {
			this._consoleLogging = true;
			this.on = true;
		}
	};

	this.disableConsoleLogging = function () {
		///	<summary>
		///	Disables console logging using the JavaScript console.log() method.
		/// By default, console logging is off.
		///	</summary>
		///	<returns type="undefined"></returns>

		this._consoleLogging = false;
		this.on = this._traceOutputTextAreaLogging;
	};

	this._writeLineImpl = function (format) {
		var toWrite, i, exp;

		if (this._traceOutputTextAreaLogging || this._consoleLogging) {
			toWrite = format;
			// Handle optional positional format specifiers like {0}, {1}, etc.
			for (i = 1; i < arguments.length; i++) {
				exp = new RegExp('\\{' + (i - 1) + '\\}', 'gm');
				toWrite = toWrite.replace(exp, arguments[i]);
			}
			if (this._traceOutputTextAreaLogging) {
				this._traceOutputTextArea.value += (toWrite + "\n");
				this._traceOutputTextArea.scrollTop = this._traceOutputTextArea.value.length;
			}
			if (this._consoleLogging) {
				console.log(toWrite);
			}
		}
	};

	this._maybeInitialize = function () {
		if (!this._initialized) {
			this._traceOutputTextArea = document.getElementById(this._traceOutputTextAreaId);
			this._traceOutputTextAreaLogging = (this._traceOutputTextArea !== null);
			this.on = this._traceOutputTextAreaLogging || this._consoleLogging;
			this._initialized = true;
		}
	};

	this._defined = true;
};

TRACE._definition(); // invoke above definition function
