function execInLively(fnc, cb = () => {}) {
    chrome.devtools.inspectedWindow.eval('(' + fnc.toString() + ')()', cb);
}
