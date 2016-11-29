class Lively4ChromeDebugger {
	constructor() {
		this.lastResult = null;
        this.resolvers = {};
        this.idCounter = 0;

        document.addEventListener('EvalResult', this.saveResult.bind(this));
	}

    evalInContentScriptContext(userFunction) {
        return new Promise((resolve, reject) => {
            this.resolvers[++this.idCounter] = resolve;
            document.dispatchEvent(new CustomEvent('EvalInContentScriptContext', {
                detail: {
                    id: this.idCounter,
                    code: userFunction.toString()
                }
            }));
        });
    }

    evalInExtensionContext(userFunction) {
        return new Promise((resolve, reject) => {
            this.resolvers[++this.idCounter] = resolve;
            document.dispatchEvent(new CustomEvent('EvalInExtensionContext', {
                detail: {
                    id: this.idCounter,
                    code: userFunction.toString()
                }
            }));
        });
    }

    saveResult(e) {
        if (e.detail.id in this.resolvers) {
            this.resolvers[e.detail.id](e.detail.result);
        }
    }
}

var lively4ChromeDebugger = new Lively4ChromeDebugger();
