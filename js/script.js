class Lively4ChromeDebugger {
	constructor() {
		this.lastResult = null;
        this.resolvers = {};
        this.rejecters = {};
        this.idCounter = 0;
        this.targets = [];

        document.addEventListener('ResolveResult', this._resolveResult.bind(this));
        document.addEventListener('DebuggerPaused', this._debuggerPaused.bind(this));
	}

    _resolveResult(e) {
        var rId = e.detail.id;
        if (rId in this.resolvers) {
            var data = e.detail.result;
            if (data && 'error' in data) {
                this.rejecters[rId](data);
            } else {
                this.resolvers[rId](data);
            }
            delete this.rejecters[rId];
            delete this.resolvers[rId];
        } else {
            console.warn('No resolver for:', e.detail);
        }
    }

    _debuggerPaused(e) {
        var debuggers = document.getElementsByTagName('lively-debugger');
        for (var i = 0; i < debuggers.length; i++) {
            debuggers[i].dispatchDebuggerPaused(e.detail.result);
        }
    }

    _sendToContentScript(data) {
        return new Promise((resolve, reject) => {
            this.idCounter++;
            this.resolvers[this.idCounter] = resolve;
            this.rejecters[this.idCounter] = reject;
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
        return this._evalInContext(userCode, 'SendToDevTools');
    }

    evalInPanelContext(userCode) {
        return this._evalInContext(userCode, 'SendToPanel');
    }

    getDebuggingTargets() {
        return this._sendToContentScript({
            id: this.idCounter,
            type: 'DebuggingTargets'
        });
    }

    getDebuggingScripts() {
        return this._sendToContentScript({
            id: this.idCounter,
            type: 'DebuggingScripts'
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
