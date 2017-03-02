var portToContentScript, portToDevTools, portToPanel;
var scripts = [];
var lastAttachedTarget = null;

function onDebuggerEvent(debuggeeId, method, params) {
    if (method == 'Debugger.paused') {
        onDebuggerPaused(debuggeeId, params);
    } else if (method == 'Debugger.scriptParsed') {
        scripts.push(params); // remember all parsed
    } else {
        console.log('Unsupported event:', method, params);
    }
}

function onDebuggerPaused(debuggeeId, params) {
    portToContentScript.postMessage({
        eventName: 'DebuggerPaused',
        result: params
    });
}

function registerPort(portVariable, port, onMessageHandler, onDisconnectCb) {
    window[portVariable] = port;
    window[portVariable].onMessage.addListener(onMessageHandler);
    window[portVariable].onDisconnect.addListener(function(event) {
        window[portVariable] = undefined;
        if (onDisconnectCb) onDisconnectCb();
    });
}

function handleEvalRequest(message) {
    portToContentScript.postMessage({
        id: message.id,
        result: {
            code: message.code,
            result: eval('(' + message.code + ')()')
        }
    });
}

function handleError(message, errorMessage) {
    portToContentScript.postMessage({
        id: message.id,
        result: {
            error: errorMessage,
        }
    });
}

function handleDebuggingTargetsRequest(message) {
    chrome.debugger.getTargets((targets) => {
        portToContentScript.postMessage({
            id: message.id,
            result: targets
        });
    });
}

function handleDebuggingScriptsRequest(message) {
    portToContentScript.postMessage({
        id: message.id,
        result: scripts
    });
}

function handleDebuggerAttachRequest(message) {
    scripts = []; // clear list of scripts
    lastAttachedTarget = message.target;
    chrome.debugger.attach(lastAttachedTarget, '1.2', () => {
        portToContentScript.postMessage({ id: message.id });
    });
}

function handleDebuggerDetachRequest(message) {
    chrome.debugger.detach(message.target, () => {
        portToContentScript.postMessage({ id: message.id });
    });
}

function handleDebuggerCommandRequest(message) {
    chrome.debugger.sendCommand(message.target, message.method, message.params,
        (res) => {
            portToContentScript.postMessage({
                id: message.id,
                result: res
            });
        }
    );
}

function onRuntimeConnect(port) {
    if (port.name == 'ContentScriptToBackground') {
        registerPort('portToContentScript', port, (message, sender) => {
            if (message.type == 'EvalBackground') {
                handleEvalRequest(message);
            } else if (message.type == 'SendToDevTools') {
                if (portToDevTools) {
                    portToDevTools.postMessage(message);
                } else {
                    handleError(message, 'Cannot connect to DevTools. Are they open?');
                }
            } else if (message.type == 'SendToPanel') {
                if (portToPanel) {
                    portToPanel.postMessage(message);
                } else {
                    handleError(message, 'Cannot connect to Lively4 panel. Is it open?');
                }
            } else if (message.type == 'DebuggingTargets') {
                handleDebuggingTargetsRequest(message);
            } else if (message.type == 'DebuggingScripts') {
                handleDebuggingScriptsRequest(message);
            } else if (message.type == 'DebuggerAttach') {
                handleDebuggerAttachRequest(message);
            } else if (message.type == 'DebuggerDetach') {
                handleDebuggerDetachRequest(message);
            } else if (message.type == 'DebuggerCommand') {
                handleDebuggerCommandRequest(message);
            } else {
                console.warn('Unknown message:', message);
            }
        }, () => {
            if (lastAttachedTarget) {
                chrome.debugger.detach(lastAttachedTarget);
            }
        });
    } else if (port.name == 'DevToolsToBackground') {
        registerPort('portToDevTools', port, (message, sender) => {
            portToContentScript.postMessage(message);
        });
    } else if (port.name == 'PanelToBackground') {
        registerPort('portToPanel', port, (message, sender) => {
            portToContentScript.postMessage(message);
        });
    } else {
        console.warn('Unknown port:', port);
    }
}

chrome.debugger.onEvent.addListener(onDebuggerEvent);
chrome.runtime.onConnect.addListener(onRuntimeConnect);
