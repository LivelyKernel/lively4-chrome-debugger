class Lively4ChromeDebuggerExtension {
    constructor() {
        this.panel = chrome.devtools.panels.create('Lively4', '/img/logo.png', '/panel.html');

        this.sidebarPane = chrome.devtools.panels.elements.createSidebarPane('Lively4 Modules', function(sidebar) {
            var modules = () => lively.modules.getPackages().map((ea) =>
                ({name: ea.name, main: ea.main}));
            evalInLively(modules, (result, isException) => {
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

        // open port to background page, so that we can execute code in this context
        this.portToBackground = chrome.runtime.connect({name: 'DevToolsToBackground'});
        this.portToBackground.onMessage.addListener((message) => {
            this.portToBackground.postMessage({
                id: message.id,
                result: {
                    code: message.code,
                    result: eval('(' + message.code + ')()')
                }
            });
        });
    }
}

/* global chrome */
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
