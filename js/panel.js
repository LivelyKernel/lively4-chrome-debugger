function Lively4Panel() {
    this.backgroundPageConnection = chrome.runtime.connect({
        name: 'panel'
    });

    this.backgroundPageConnection.postMessage({
        name: 'init',
        tabId: chrome.devtools.inspectedWindow.tabId
    });

    this._registerNavButtons();
}

Lively4Panel.prototype = {
    _initializers: {
        testing: function() {
            document.getElementById('open-sync-window').addEventListener('click', function() {
                exec(() => lively.openComponentInWindow('lively-sync'));
            });
        }
    },

    _initTemplate(templateId) {
        var content = document.querySelector('#' + templateId + '-template');
        var main = document.querySelector('#main');
        var clone = document.importNode(content.content, true);
        main.innerHTML = '';
        main.appendChild(clone);
        var cb = Lively4Panel.prototype._initializers[templateId];
        if (cb) cb();
    },

    _registerNavButtons: function() {
        var navButtons = document.getElementsByClassName('nav-button');

        var clickHandler = function() {
            var oldSelection = document.getElementsByClassName('selected')[0];
            oldSelection.classList.remove('selected');
            this.classList.add('selected');

            Lively4Panel.prototype._initTemplate(this.id);
        };

        for (var i = 0; i < navButtons.length; i++) {
            navButtons[i].addEventListener('click', clickHandler.bind(navButtons[i]));
        }

        var initButton = document.getElementsByClassName('selected')[0];
        this._initTemplate(initButton.id);
    }
};

var lively4Panel = new Lively4Panel();
