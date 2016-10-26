var lively4Panel = chrome.devtools.panels.create(
	"Lively4", "/img/logo.png", "/panel.html"
);

function exec(fnc, cb = () => {}) {
  chrome.devtools.inspectedWindow.eval("(" + fnc.toString() + ")()", cb);
}

chrome.devtools.panels.elements.createSidebarPane("Lively4", function(sidebar) {
  var modules = () => lively.modules.getPackages().map((ea) =>
    ({name: ea.name, main: ea.main}));
  exec(moduls, (result, isException) => {
    var data;
    if (!isException)
      data = result;
    else
      data = isException;
    sidebar.setObject(data);
  });
});