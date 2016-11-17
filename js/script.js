'use strict';

class Lively4ChromeDebugger {
	constructor() {
		this.lastResult = null;

		document.addEventListener('ExtensionContextResult', this.saveResult.bind(this));
	}

    evalInContentScriptContext(codeString) {
        document.dispatchEvent(new CustomEvent('EvalInContentScriptContext', { detail: codeString }));
    }

    evalInExtensionContext(codeString) {
        document.dispatchEvent(new CustomEvent('EvalInExtensionContext', { detail: codeString }));
    }

    saveResult(e) {
    	this.lastResult = e.detail;
    }
}

var lively4ChromeDebugger = new Lively4ChromeDebugger();
