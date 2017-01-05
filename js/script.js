class Lively4ChromeDebugger {
	constructor() {
		this.lastResult = null;
        this.resolvers = {};
        this.idCounter = 0;
        this.targets = [];

        document.addEventListener('ResolveResult', (e) => {
            if (e.detail.id in this.resolvers) {
                this.resolvers[e.detail.id](e.detail.result);
            } else {
                console.warn('No resolver for:', e.detail);
            }
        });
        document.addEventListener('DebuggerPaused', (e) => {
            var debuggers = document.getElementsByTagName('lively-debugger');
            var data = e.detail.result;
            for (var i = 0; i < debuggers.length; i++) {
                var d = debuggers[i];
                d.innerHTML = '';
                d.codeEditor.setValue(data.callFrames[0].scriptSource);
                d.codeEditor.gotoLine(data.callFrames[0].location.lineNumber);
                var scopeChain = data.callFrames[0].scopeChain;
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

    _sendToContentScript(data) {
        return new Promise((resolve, reject) => {
            this.resolvers[++this.idCounter] = resolve;
            data.id = this.idCounter;
            document.dispatchEvent(new CustomEvent('SendToContentScript', {
                detail: data
            }));
        });
    }

    _evalInContext(userCode, context) {
        return this._sendToContentScript({
            id: this.idCounter,
            code: userCode,
            type: context
        });
    }

    evalInContentScriptContext(userCode) {
        return this._evalInContext(userCode, 'EvalContentScript');
    }

    evalInBackgroundScriptContext(userCode) {
        return this._evalInContext(userCode, 'EvalBackground');
    }

    evalInDevToolsContext(userCode) {
        return this._evalInContext(userCode, 'EvalDevTools');
    }

    evalInPanelContext(userCode) {
        return this._evalInContext(userCode, 'EvalPanel');
    }

    getDebuggingTargets() {
        return this._sendToContentScript({
            id: this.idCounter,
            type: 'DebuggingTargets'
        });
    }

    debuggerAttach(targetId) {
        return this._sendToContentScript({
            id: this.idCounter,
            type: 'DebuggerAttach',
            targetId: targetId
        });
    }

    debuggerDetach(targetId) {
        return this._sendToContentScript({
            id: this.idCounter,
            type: 'DebuggerDetach',
            targetId: targetId
        });
    }

    debuggerSendCommand(targetId, method, params) {
        return this._sendToContentScript({
            id: this.idCounter,
            type: 'DebuggerCommand',
            targetId: targetId,
            method: method,
            params: params
        });
    }
}

var lively4ChromeDebugger = new Lively4ChromeDebugger();
