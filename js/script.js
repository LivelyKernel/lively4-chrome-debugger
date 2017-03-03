const PROMISE_TIMEOUT = 5000;

class Lively4ChromeDebugger {
	constructor() {
		this.lastResult = null;
        this.resolvers = {};
        this.rejecters = {};
        this.idCounter = 0;
        this.targets = [];

        document.addEventListener('ResolveResult', this._resolveResult.bind(this));
        document.addEventListener('DebuggerPaused', this._debuggerPaused.bind(this));
        document.addEventListener('AsyncEvalInLively', this._asyncEvalInLively.bind(this));
	}

    /* Public Eval Functions */

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

    /* Debugger Interaction */

    getDebuggingTargets() {
        return this._sendToContentScript({
            requestType: 'DebuggingTargets'
        });
    }

    getCurrentDebuggingTarget() {
        return this._sendToContentScript({
            requestType: 'GetCurrentDebuggingTarget'
        });
    }

    getDebuggingScripts() {
        return this._sendToContentScript({
            requestType: 'DebuggingScripts'
        });
    }

    debuggerAttach(target) {
        return this._sendToContentScript({
            requestType: 'DebuggerAttach',
            target: target
        });
    }

    debuggerDetach(target) {
        return this._sendToContentScript({
            requestType: 'DebuggerDetach',
            target: target
        });
    }

    debuggerSendCommand(target, method, params) {
        return this._sendToContentScript({
            requestType: 'DebuggerCommand',
            target: target,
            method: method,
            params: params
        });
    }

    createWindow(createData) {
        createData.requestType = 'CreateWindow';
        return this._sendToContentScript(createData);
    }

    /* Communication handling */

    _resolveResult(e) {
        var promiseId = e.detail.id;
        if (promiseId in this.resolvers) {
            var data = e.detail.result;
            if (data && 'error' in data) {
                this.rejecters[promiseId](data);
            } else {
                this.resolvers[promiseId](data);
            }
            this._deleteRejecterResolverPair(promiseId);
        } else {
            console.warn('No resolver for:', e.detail);
        }
    }

    _deleteRejecterResolverPair(promiseId) {
        delete this.rejecters[promiseId];
        delete this.resolvers[promiseId];
    }

    _sendToContentScript(data) {
        return new Promise((resolve, reject) => {
            this.idCounter++;
            var promiseId = this.idCounter;
            this.resolvers[promiseId] = resolve;
            this.rejecters[promiseId] = reject;
            setTimeout(() => {
                if (promiseId in this.rejecters) {
                    this.rejecters[promiseId]({'error': 'Promise timed out.'});
                    this._deleteRejecterResolverPair(promiseId);
                }
            }, PROMISE_TIMEOUT);
            data.id = promiseId;
            this._dispatchEventToContentScript(data);
        });
    }

    _dispatchEventToContentScript(data) {
        document.dispatchEvent(new CustomEvent('SendToContentScript', {
            detail: data
        }));
    }

    /* Private helpers */

    _evalInContext(userCode, context) {
        return this._sendToContentScript({
            code: userCode,
            requestType: context
        });
    }

    _asyncEvalInLively(e) {
        var message = e.detail;
        eval('(' + message.code + ')()').then((res) => {
            // panel will not respond, no need to use a promise
            this._dispatchEventToContentScript({
                id: message.id,
                requestType: message.requestType,
                result: {
                    code: message.code,
                    result: res
                }
            });
        });
    }

    _debuggerPaused(e) {
        var debuggers = document.getElementsByTagName('lively-debugger');
        for (var i = 0; i < debuggers.length; i++) {
            debuggers[i].dispatchDebuggerPaused(e.detail.result);
        }
    }
}

var lively4ChromeDebugger = new Lively4ChromeDebugger();
