class Lively4ContentScript {
    constructor() {
        this.injectScriptIntoWebsite();
        this.registerEventListeners();

        this.port = chrome.runtime.connect({name: "livel4chromeextension"});
        this.port.onMessage.addListener(function (message, sender) {
            if ('params' in message) {
                document.dispatchEvent(new CustomEvent('EvalDebuggerResult', { detail: message }));
            } else if ('targets' in message) {
                document.dispatchEvent(new CustomEvent('DebuggingTargets', { detail: message.targets }));
            } else {
                document.dispatchEvent(new CustomEvent('EvalResult', { detail: message }));
            }
        });        
    }

    injectScriptIntoWebsite() {
        var script = document.createElement('script');
        script.src = chrome.extension.getURL('js/script.js');
        (document.head || document.documentElement).appendChild(script);
        // script.onload = function() {
        //     script.remove();
        // };
    }

    registerEventListeners() {
        document.addEventListener('EvalInContentScriptContext', function(e) {
            document.dispatchEvent(new CustomEvent('EvalResult', {
                detail: {
                    id: e.detail.id,
                    result: eval('(' + e.detail.code + ')()')
                }
            }));
        });
        
        document.addEventListener('EvalInExtensionContext', function(e) {
            e.detail.target = 'extension';
            this.sendToExtension(e);
        }.bind(this));

        document.addEventListener('EvalInBackgroundScriptContext', this.sendToExtension.bind(this));
    }

    sendToExtension(e) {
        this.port.postMessage(e.detail);
    }
}

new Lively4ContentScript();
