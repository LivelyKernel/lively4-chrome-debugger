function Lively4ChromeDebugger() {
    this.Panel = chrome.devtools.panels.create("Lively4", "/img/logo.png", "/panel.html");

    this.SidebarPane = chrome.devtools.panels.elements.createSidebarPane("Lively4", function(sidebar) {
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
        })
    });
}

/* global chrome */
var lively4ChromeDebugger = null;
var checkForLively4Interval = setInterval(function() {
    createPanelIfLivelyPageFound();
}, 3000);

function createPanelIfLivelyPageFound() {
  if (lively4ChromeDebugger) {
    return;
  }

  exec(() => lively !== undefined, (isLivelyPage, err) => {
    if (!isLivelyPage || lively4ChromeDebugger) {
      return;
    }

    lively4ChromeDebugger = new Lively4ChromeDebugger();
  });
}

chrome.devtools.network.onNavigated.addListener(() => {
    createPanelIfLivelyPageFound();
});

createPanelIfLivelyPageFound();
