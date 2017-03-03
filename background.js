var portsToContentScripts = {}; // mapping: tabId -> port
var portsToDevToolsAndPanels = {}; // mapping: frameId -> port
var portsToPanels = {}; // mapping: inspected tabId -> port
var portsToDevTools = {}; // mapping: inspected tabId -> port
var debugSessions = {}; // mapping: Debuggee targetId -> port
var scripts = [];

function onDebuggerEvent(debuggeeId, method, params) {
    if (method == 'Debugger.paused') {
        onDebuggerPaused(debuggeeId, params);
    } else if (method == 'Debugger.scriptParsed') {
        scripts.push(params); // remember all parsed
    } else {
        console.log('Unsupported event:', method, params);
    }
}

function getTabIdFromPort(port) {
    if (!('sender' in port && 'tab' in port.sender &&
          'id' in port.sender.tab)) {
        console.warn('Not connecting to a tab.');
        debugger;
        return;
    }
    return port.sender.tab.id;
}

function getFrameIdFromPort(port) {
    if (!('sender' in port && 'frameId' in port.sender)) {
        console.warn('Not connecting to a frame.');
        debugger;
        return;
    }
    return port.sender.frameId;
}

function onDebuggerPaused(debuggee, params) {
    if (!('targetId' in debuggee && debuggee.targetId in debugSessions)) {
        console.warn('Unable to find port to debugger UI.');
        debugger;
        return;
    }
    debugSessions[debuggee.targetId].postMessage({
        eventName: 'DebuggerPaused',
        result: params
    });
}

function registerContentScriptPort(port, onMessageHandler, onDisconnectCb) {
    var tabId = getTabIdFromPort(port);
    portsToContentScripts[tabId] = port;
    port.onMessage.addListener(onMessageHandler);
    port.onDisconnect.addListener(function(closedPort) {
        window[tabId] = undefined;
        if (onDisconnectCb) onDisconnectCb(closedPort);
    });
}

function registerDevToolsPort(port, onMessageHandler, onDisconnectCb) {
    var frameId = getFrameIdFromPort(port);
    portsToDevToolsAndPanels[frameId] = port;
    port.onMessage.addListener(onMessageHandler);
    port.onDisconnect.addListener(function(closedPort) {
        window[frameId] = undefined;
        if (onDisconnectCb) onDisconnectCb(closedPort);
    });
}

function handleEvalRequest(message, senderPort) {
    message.result = {
        code: message.code,
        result: eval('(' + message.code + ')()')
    };
    senderPort.postMessage(message);
}

function handleError(message, senderPort, errorMessage) {
    message.result = {
        error: errorMessage,
    };
    senderPort.postMessage(message);
}

function handleDebuggingTargetsRequest(message, senderPort) {
    chrome.debugger.getTargets((targets) => {
        message.result = targets;
        senderPort.postMessage(message);
    });
}

function handleGetCurrentDebuggingTargetId(message, senderPort) {
    var tabId = getTabIdFromPort(senderPort);
    chrome.debugger.getTargets((targets) => {
        targets.forEach((ea) => {
            if (ea.tabId == tabId) {
                message.result = { targetId: ea.id };
                senderPort.postMessage(message);
            }
        });
    });
}

function handleDebuggingScriptsRequest(message, senderPort) {
    message.result = scripts;
    senderPort.postMessage(message);
}

function handleDebuggerAttachRequest(message, senderPort) {
    scripts = []; // clear list of scripts
    chrome.debugger.attach(message.target, '1.2', () => {
        debugSessions[message.target.targetId] = senderPort;
        senderPort.postMessage(message);
    });
}

function handleDebuggerDetachRequest(message, senderPort) {
    chrome.debugger.detach(message.target, () => {
        delete debugSessions[message.target.targetId];
        senderPort.postMessage(message);
    });
}

function handleDebuggerCommandRequest(message, senderPort) {
    chrome.debugger.sendCommand(message.target, message.method, message.params,
        (res) => {
            message.result = res;
            senderPort.postMessage(message);
        }
    );
}

function handleCreateWindowRequest(message, senderPort) {
    if (!('url' in message)) {
        message.error = 'No URL provided.';
    } else {
        chrome.windows.create({
            left: message.left || 100,
            top: message.top || 100,
            width: message.width || 800,
            height: message.height || 600,
            focused: message.focused || true,
            type: message.type || 'normal',
            url: message.url
        });
    }
    senderPort.postMessage(message);
}

function onRuntimeConnect(port) {
    if (port.name == 'ContentScriptToBackground') {
        registerContentScriptPort(port, (message, senderPort) => {
            var tabId;
            if (message.requestType == 'EvalBackground') {
                handleEvalRequest(message, senderPort);
            } else if (message.requestType == 'SendToDevTools') {
                tabId = getTabIdFromPort(senderPort);
                if (tabId in portsToDevTools) {
                    portsToDevTools[tabId].postMessage(message);
                } else {
                    handleError(message, senderPort,
                        'Cannot connect to DevTools. Are they open?');
                }
            } else if (message.requestType == 'SendToPanel') {
                tabId = getTabIdFromPort(senderPort);
                if (tabId in portsToPanels) {
                    portsToPanels[tabId].postMessage(message);
                } else {
                    handleError(message, senderPort,
                        'Cannot connect to Lively4 panel. Is it open?');
                }
            } else if (message.requestType == 'DebuggingTargets') {
                handleDebuggingTargetsRequest(message, senderPort);
            } else if (message.requestType == 'GetCurrentDebuggingTarget') {
                handleGetCurrentDebuggingTargetId(message, senderPort);
            } else if (message.requestType == 'DebuggingScripts') {
                handleDebuggingScriptsRequest(message, senderPort);
            } else if (message.requestType == 'DebuggerAttach') {
                handleDebuggerAttachRequest(message, senderPort);
            } else if (message.requestType == 'DebuggerDetach') {
                handleDebuggerDetachRequest(message, senderPort);
            } else if (message.requestType == 'DebuggerCommand') {
                handleDebuggerCommandRequest(message, senderPort);
            } else if (message.requestType == 'CreateWindow') {
                handleCreateWindowRequest(message, senderPort);
            } else {
                console.warn('Unknown message:', message);
            }
        }, (closedPort) => {
            // detach debugger for port if still active
            for (var targetId in debugSessions) {
              if (debugSessions.hasOwnProperty(targetId) &&
                  debugSessions[targetId] == closedPort) {
                chrome.debugger.detach({ targetId: targetId });
              }
            }
        });
    } else if (port.name == 'PanelToBackground' ||
               port.name == 'DevToolsToBackground') {
        registerDevToolsPort(port, (message, senderPort) => {
            if (message.requestType == 'GetInspectedTabId') {
                if (message.portType == 'DevTools') {
                    portsToDevTools[message.inspectedTabId] = senderPort;
                } else {
                    portsToPanels[message.inspectedTabId] = senderPort;
                }
                return;
            }
            if (!('inspectedTabId' in message &&
                  message.inspectedTabId in portsToContentScripts)) {
                console.warn('Unable to find port to content script.');
                debugger;
                return;
            }
            portsToContentScripts[message.inspectedTabId].postMessage(message);
        });
        // Get inspectedTabId for portsToDevTools and portsToPanels maps
        port.postMessage({requestType: 'GetInspectedTabId'});
    } else {
        console.warn('Unknown port:', port);
    }
}

chrome.debugger.onEvent.addListener(onDebuggerEvent);
chrome.runtime.onConnect.addListener(onRuntimeConnect);
