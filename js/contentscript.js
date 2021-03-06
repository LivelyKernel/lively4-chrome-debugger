class Lively4ContentScript {
    constructor() {
        this.injectScriptIntoWebsite();
        this.registerEventListeners();
        this.openPortToBackgroundPage();
        
    }

    injectScriptIntoWebsite() {
        var script = document.createElement('script');
        script.src = chrome.extension.getURL('js/script.js');
        (document.head || document.documentElement).appendChild(script);
        // script.onload = () => { script.remove() };
    }

    registerEventListeners() {
        document.addEventListener('SendToContentScript', (e) => {
            if (e.detail.requestType == 'EvalContentScript') {
                this._eval(e.detail);
            } else { // forward everything else to background page
                this.portToBackground.postMessage(e.detail);
            }
        });
    }

    openPortToBackgroundPage() {
        this.portToBackground = chrome.runtime.connect({
            name: 'ContentScriptToBackground'
        });
        this.portToBackground.onMessage.addListener(this._dispatchMessage);
    }

    /* Private helpers */

    _eval(message) {
        document.dispatchEvent(new CustomEvent('ResolveResult', {
            detail: {
                id: message.id,
                result: {
                    code: message.code,
                    result: eval('(' + message.code + ')()')
                }
            }
        }));
    }

    _dispatchMessage(message, sender) {
        var eventName = message.eventName || 'ResolveResult';
        document.dispatchEvent(new CustomEvent(eventName, {
            detail: message
        }));
    }
}

new Lively4ContentScript();
