class Lively4ChromeDebuggerExtension {
    constructor() {
        this.panel = chrome.devtools.panels.create('Lively4', '/img/logo.png', '/panel.html');

        this.sidebarPane = chrome.devtools.panels.elements.createSidebarPane('Lively4', function(sidebar) {
            var modules = () => lively.modules.getPackages().map((ea) =>
                ({name: ea.name, main: ea.main}));
            exec(modules, (result, isException) => {
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

        this.port = chrome.runtime.connect({name: 'livel4chromebackend'});
        this.port.onMessage.addListener(this.callFunction.bind(this));
    }

    callFunction (message) {
        var value = eval(message.code);
        this.port.postMessage({result: value, messageCode: message.code});
    }
}

/* global chrome */
var lively4ChromeDebuggerExtension = null;
var checkForLively4Interval = setInterval(function() {
    createPanelIfLivelyPageFound();
}, 3000);

function createPanelIfLivelyPageFound() {
  if (lively4ChromeDebuggerExtension) {
    return;
  }

  exec(() => lively !== undefined, (isLivelyPage, err) => {
    if (!isLivelyPage || lively4ChromeDebuggerExtension) {
      return;
    }

    lively4ChromeDebuggerExtension = new Lively4ChromeDebuggerExtension();
  });
}

chrome.devtools.network.onNavigated.addListener(() => {
    createPanelIfLivelyPageFound();
});

createPanelIfLivelyPageFound();
