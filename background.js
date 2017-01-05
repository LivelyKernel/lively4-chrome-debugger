var portToContentScript, portToDevTools, portToPanel;
var scripts = [];

function onDebuggerEvent(debuggeeId, method, params) {
  if (method == 'Debugger.scriptParsed') {
    scripts.push(params); // remeber all parsed scripts for now
  } else if (method == 'Debugger.paused') {
    onDebuggerPaused(debuggeeId, params);
  }
}

function onDebuggerPaused(debuggeeId, params) {
    var currentScriptLocation = params.callFrames[0].location;
    chrome.debugger.sendCommand(
        debuggeeId,
        'Debugger.getScriptSource',
        currentScriptLocation,
        (res) => {
            params.callFrames[0].scriptSource = res.scriptSource;
            portToContentScript.postMessage({
                eventName: 'DebuggerPaused',
                result: params
            });
        }
    );
}

function ensurePortVariable(portVariable, port) {
    if (!window[portVariable]) {
        window[portVariable] = port;
        window[portVariable].onDisconnect.addListener(function(event) {
            window[portVariable] = null;
        });
    }
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

function handleDebuggerAttachRequest(message) {
    var target = { targetId: message.targetId };
    chrome.debugger.attach(target, '1.0', () => {
        portToContentScript.postMessage({ id: message.id });
    });
}

function handleDebuggerDetachRequest(message) {
    chrome.debugger.detach({ targetId: message.targetId }, () => {
        portToContentScript.postMessage({ id: message.id });
    });
}

function handleDebuggerCommandRequest(message) {
    chrome.debugger.sendCommand(
        { targetId: message.targetId },
        `Debugger.${message.method}`,
        message.params,
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
        ensurePortVariable('portToContentScript', port);
        portToContentScript.onMessage.addListener(function (message, sender) {
            if (message.type == 'EvalBackground') {
                handleEvalRequest(message);
            } else if (message.type == 'EvalDevTools') {
                if (portToDevTools) {
                    portToDevTools.postMessage(message);
                } else {
                    handleError(message, 'Cannot connect to DevTools. Are they open?');
                }
            } else if (message.type == 'EvalPanel') {
                if (portToPanel) {
                    portToPanel.postMessage(message);
                } else {
                    handleError(message, 'Cannot connect to Lively4 panel. Is it open?');
                }
            } else if (message.type == 'DebuggingTargets') {
                handleDebuggingTargetsRequest(message);
            } else if (message.type == 'DebuggerAttach') {
                handleDebuggerAttachRequest(message);
            } else if (message.type == 'DebuggerDetach') {
                handleDebuggerDetachRequest(message);
            } else if (message.type == 'DebuggerCommand') {
                handleDebuggerCommandRequest(message);
            } else {
                console.warn('Unknown message:', message);
            }
        });
    } else if (port.name == 'DevToolsToBackground') {
        ensurePortVariable('portToDevTools', port);
        portToDevTools.onMessage.addListener(function (message, sender) {
            portToContentScript.postMessage(message);
        });
    } else if (port.name == 'PanelToBackground') {
        ensurePortVariable('portToPanel', port);
        portToPanel.onMessage.addListener(function (message, sender) {
            portToContentScript.postMessage(message);
        });
    } else {
        console.warn('Unknown port:', port);
    }
}

chrome.debugger.onEvent.addListener(onDebuggerEvent);
chrome.runtime.onConnect.addListener(onRuntimeConnect);
