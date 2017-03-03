class Lively4ChromeDebuggerExtension {
    constructor() {
        this.panel = chrome.devtools.panels.create(
            'Lively4', '/img/logo.png', '/panel.html');

        this.sidebarPane = chrome.devtools.panels.elements.createSidebarPane(
                'Lively4 Windows', function(sidebar) {
            var windows = function() {
                return Array.from(document.querySelectorAll('lively-window'))
                    .map((ea) => ({
                        name: ea.getAttribute('title'),
                        offsetLeft: ea.offsetLeft,
                        offsetTop: ea.offsetTop
                    }));
            };
            evalInLively(windows, (result, isException) => {
                var data;
                if (!isException) {
                    data = result;
                }
                else {
                    data = isException;
                }
                sidebar.setObject(data);
            });
        });

        // open port to background page, so that code can be executed in context
        this.portToBackground = chrome.runtime.connect({
            name: 'DevToolsToBackground'
        });
        this.portToBackground.onMessage.addListener((message, senderPort) => {
            if (message.requestType == 'GetInspectedTabId') {
                message.inspectedTabId = chrome.devtools.inspectedWindow.tabId;
                message.portType = 'DevTools';
                senderPort.postMessage(message);
            } else {
                senderPort.postMessage({
                    id: message.id,
                    inspectedTabId: chrome.devtools.inspectedWindow.tabId,
                    result: {
                        code: message.code,
                        result: eval('(' + message.code + ')()')
                    }
                });   
            }
        });
    }
}

/* Global Chrome */
var lively4ChromeDebuggerExtension = null;
var checkForLively4Interval = setInterval(function() {
    createPanelIfLivelyPageFound();
}, 3000);

function createPanelIfLivelyPageFound() {
    if (lively4ChromeDebuggerExtension) return;
    evalInLively(() => lively !== undefined, (isLivelyPage, err) => {
        if (!isLivelyPage || lively4ChromeDebuggerExtension) return;
        lively4ChromeDebuggerExtension = new Lively4ChromeDebuggerExtension();
    });
}

chrome.devtools.network.onNavigated.addListener(() => {
    createPanelIfLivelyPageFound();
});

createPanelIfLivelyPageFound();
