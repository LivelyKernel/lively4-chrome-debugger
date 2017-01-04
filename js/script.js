class Lively4ChromeDebugger {
	constructor() {
		this.lastResult = null;
        this.resolvers = {};
        this.idCounter = 0;
        this.targets = [];

        document.addEventListener('EvalResult', this.saveResult.bind(this));
        document.addEventListener('EvalDebuggerResult', (e) => {
            var debuggers = document.getElementsByTagName('lively-debugger');
            for (var i = 0; i < debuggers.length; i++) {
                debuggers[i].innerHTML = '';
                var el = document.createTextNode(JSON.stringify(e.detail));
                debuggers[i].details.appendChild(el);
            }
        });
        document.addEventListener('DebuggingTargets', (e) => {
            this.targets = e.detail;
        });
	}

    _evalInContext(eventName, userCode) {
        return new Promise((resolve, reject) => {
            this.resolvers[++this.idCounter] = resolve;
            document.dispatchEvent(new CustomEvent(eventName, {
                detail: {
                    id: this.idCounter,
                    code: userCode
                }
            }));
        });
    }

    evalInContentScriptContext(userCode) {
        return this._evalInContext('EvalInContentScriptContext', userCode);
    }

    evalInBackgroundScriptContext(userCode) {
        return this._evalInContext('EvalInBackgroundScriptContext', userCode);
    }

    evalInExtensionContext(userCode) {
        return this._evalInContext('EvalInExtensionContext', userCode);
    }

    saveResult(e) {
        if (e.detail.id in this.resolvers) {
            this.resolvers[e.detail.id](e.detail.result);
        }
    }
}

var lively4ChromeDebugger = new Lively4ChromeDebugger();
