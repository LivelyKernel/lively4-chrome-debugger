var connections = {};
var ports = {};
var messageLog = [];
var scripts = [];

chrome.debugger.onEvent.addListener(onEvent);

function onEvent(debuggeeId, method, params) {
  if (method == 'Debugger.scriptParsed') {
    scripts.push(params);
  } else if (method == 'Debugger.paused') {
    onDebuggerPaused(debuggeeId, params);
  }
}

function onAttach(debuggeeId) {
  if (chrome.runtime.lastError) {
    console.log(chrome.runtime.lastError.message);
    return;
  }

  var tabId = debuggeeId.tabId;
  chrome.debugger.sendCommand(
      debuggeeId, "Debugger.enable", {},
      onDebuggerEnabled.bind(null, debuggeeId));
}

function onDebuggerEnabled(debuggeeId) {
  chrome.debugger.sendCommand(debuggeeId, "Debugger.pause");
}

function onDebuggerPaused(debuggeeId, params) {
    chrome.debugger.sendCommand(debuggeeId, "Debugger.getScriptSource", params.callFrames[0].location, (res) => {
        ports.livel4chromeextension.postMessage({params: params, scriptSource: res.scriptSource});
    });
    // chrome.debugger.sendCommand(debuggeeId, "Debugger.resume");
}

chrome.runtime.onConnect.addListener(function (port) {
    if (!ports[port.name]) {
        ports[port.name] = port;

        port.onDisconnect.addListener(function(event) {
            delete ports[port.name];
        });
    }

    if (port.name == 'livel4chromeextension') {
        port.onMessage.addListener(function (message, sender) {
            if (message.target == "extension") {
                ports.livel4chromebackend.postMessage(message);
            } else if (message.target == "debuggingTargets") {
                chrome.debugger.getTargets((targets) => {
                    ports.livel4chromeextension.postMessage({
                        id: message.id,
                        result: targets
                    });
                });
            } else {
                ports.livel4chromeextension.postMessage({
                    id: message.id,
                    result: eval('(' + message.code + ')()'),
                    messageCode: message.code
                });
            }
        });
    } else if (port.name == 'livel4chromebackend') {
        port.onMessage.addListener(function (message, sender) {
            ports.livel4chromeextension.postMessage(message);
            messageLog.push(message.messageCode);

            if (ports.livel4chromepanel) {
                ports.livel4chromepanel.postMessage({evalLog: messageLog});
            }
        });
    } else {
        var extensionListener = function (message, sender, sendResponse) {
        // The original connection event doesn't include the tab ID of the
        // DevTools page, so we need to send it explicitly.
            if (message.name == 'init') {
              connections[message.tabId] = port;
              return;
            }
        };

        // Listen to messages sent from the DevTools page
        port.onMessage.addListener(extensionListener);

        port.onDisconnect.addListener(function(port) {
            port.onMessage.removeListener(extensionListener);

            var tabs = Object.keys(connections);
            for (var i=0, len=tabs.length; i < len; i++) {
              if (connections[tabs[i]] == port) {
                delete connections[tabs[i]];
                break;
              }
            }
        });
    }
});

// Receive message from content script and relay to the devTools page for the
// current tab
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    // Messages from content scripts should have sender.tab set
    if (sender.tab) {
      var tabId = sender.tab.id;
      if (tabId in connections) {
        connections[tabId].postMessage(request);
      }
    }

    return true;
});
