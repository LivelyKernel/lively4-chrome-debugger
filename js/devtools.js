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
        });
    });
}

/* global chrome */
var panelCreated = false;
var lively4ChromeDebugger = {};
var checkForLively4Interval = setInterval(function() {
    createPanelIfLivelyPageFound();
}, 3000);

function createPanelIfLivelyPageFound() {
  if (panelCreated) {
    return;
  }

  exec(() => lively !== undefined, (isLivelyPage, err) => {
    if (!isLivelyPage || panelCreated) {
      return;
    }

    panelCreated = true;
    lively4ChromeDebugger = new Lively4ChromeDebugger();
  });
}

chrome.devtools.network.onNavigated.addListener(() => {
    createPanelIfLivelyPageFound();
});

createPanelIfLivelyPageFound();
