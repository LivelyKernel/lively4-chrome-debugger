'use strict';

class Lively4ContentScript {
    constructor() {
        var script = document.createElement('script');
        script.src = chrome.extension.getURL('js/script.js');
        (document.head||document.documentElement).appendChild(script);
        script.onload = function() {
            script.remove();
        };

        // Event listener
        document.addEventListener('EvalInContentScriptContext', function(e) {
            eval(e.detail);
        });
        document.addEventListener('EvalInExtensionContext', this.sendToExtension.bind(this));

        this.port = chrome.runtime.connect({name: "livel4chromeextension"});
        this.port.onMessage.addListener(function (message, sender) {
            document.dispatchEvent(new CustomEvent('ExtensionContextResult', { detail: message.result }));
        });        

        //chrome.extension.onMessage.addListener(function (message, sender) { alert("message: " + message.result)});
    }

    sendToExtension(e) {
        this.port.postMessage({code: e.detail});
    }
}

var lively4ContentScript = new Lively4ContentScript();
