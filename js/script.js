class Lively4ChromeDebugger {
	constructor() {
		this.lastResult = null;
        this.resolvers = {};
        this.idCounter = 0;

        document.addEventListener('EvalResult', this.saveResult.bind(this));
	}

    _evalInContext(eventName, userFunction) {
        return new Promise((resolve, reject) => {
            this.resolvers[++this.idCounter] = resolve;
            document.dispatchEvent(new CustomEvent(eventName, {
                detail: {
                    id: this.idCounter,
                    code: userFunction.toString()
                }
            }));
        });
    }

    evalInContentScriptContext(userFunction) {
        return this._evalInContext('EvalInContentScriptContext', userFunction);
    }
    

    evalInBackgroundScriptContext(userFunction) {
        return this._evalInContext('EvalInBackgroundScriptContext', userFunction);
    }

    evalInExtensionContext(userFunction) {
        return this._evalInContext('EvalInExtensionContext', userFunction);
    }

    saveResult(e) {
        if (e.detail.id in this.resolvers) {
            this.resolvers[e.detail.id](e.detail.result);
        }
    }
}

var lively4ChromeDebugger = new Lively4ChromeDebugger();
