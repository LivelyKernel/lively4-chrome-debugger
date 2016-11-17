'use strict';

class Lively4ContentScript {
    constructor() {
        this.injectScriptIntoWebsite();
        this.registerEventListeners();

        this.port = chrome.runtime.connect({name: "livel4chromeextension"});
        this.port.onMessage.addListener(function (message, sender) {
            document.dispatchEvent(new CustomEvent('ExtensionContextResult', { detail: message.result }));
        });        
    }

    injectScriptIntoWebsite() {
        var script = document.createElement('script');
        script.src = chrome.extension.getURL('js/script.js');
        (document.head||document.documentElement).appendChild(script);
        script.onload = function() {
            script.remove();
        };
    }

    registerEventListeners() {
        document.addEventListener('EvalInContentScriptContext', function(e) {
            eval(e.detail);
        });
        
        document.addEventListener('EvalInExtensionContext', this.sendToExtension.bind(this));
    }

    sendToExtension(e) {
        this.port.postMessage({code: e.detail});
    }
}

var lively4ContentScript = new Lively4ContentScript();
