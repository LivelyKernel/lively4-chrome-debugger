class Lively4ChromeDebugger {
	constructor() {
		this.lastResult = null;
        this.resolvers = {};
        this.idCounter = 0;
        this.targets = [];

        document.addEventListener('EvalResult', this.saveResult.bind(this));
        document.addEventListener('EvalDebuggerResult', (e) => {
            var debuggers = document.getElementsByTagName('lively-debugger');
            var data = e.detail;
            for (var i = 0; i < debuggers.length; i++) {
                var d = debuggers[i];
                d.innerHTML = '';
                d.codeEditor.setValue(data.scriptSource);
                d.codeEditor.gotoLine(data.params.callFrames[0].location.lineNumber);
                var scopeChain = data.params.callFrames[0].scopeChain;
                for (var j = 0; j < scopeChain.length; j++) {
                    var scope = scopeChain[j];
                    var title = document.createElement('b');
                    title.innerHTML = scope.type;
                    var content = document.createElement('pre');
                    content.innerHTML = JSON.stringify(scope.object, null, '  ');
                    d.details.appendChild(title);
                    d.details.appendChild(content);
                }
            }
        });
	}

    refresh() {
        this._getDebuggingTargets().then((targets) => {
            this.targets = targets;
        });
    }

    _getDebuggingTargets() {
        return new Promise((resolve, reject) => {
            this.resolvers[++this.idCounter] = resolve;
            document.dispatchEvent(
                new CustomEvent('EvalInBackgroundScriptContext', {
                    detail: {
                        id: this.idCounter,
                        target: 'debuggingTargets'
                    }
                }
            ));
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
