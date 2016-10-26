// Create a connection to the background page
var backgroundPageConnection = chrome.runtime.connect({
    name: "panel"
});

backgroundPageConnection.postMessage({
    name: 'init',
    tabId: chrome.devtools.inspectedWindow.tabId
});

function exec(fnc, cb = () => {}) {
  chrome.devtools.inspectedWindow.eval("(" + fnc.toString() + ")()", cb);
}


exec(() => lively !== undefined, (result, isException) =>
  document.querySelector("#lively-detected").innerHTML = !isException
);


document.getElementById("services").addEventListener("click", function() {
  exec(() => lively.openComponentInWindow('lively-sync'));
});