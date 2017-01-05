class Lively4Panel {
    constructor() {
        Lively4Panel._initializers = {
            network: function() {
                if (lively4Panel.requestLogInterval) return;
                lively4Panel.requestLogInterval = setInterval(() => {
                    let networkList = document.getElementsByClassName('network-list');
                    for (let i = 0; i < networkList.length; i++) {
                        networkList[i].innerHTML = '';
                        networkList[i].appendChild(lively4Panel.networkContent());
                    }
                }, 1000);
            },
            testing: function() {
                document.getElementById('open-sync-window').addEventListener('click', function() {
                    exec(() => lively.openComponentInWindow('lively-sync'));
                });
            }
        };

        this._registerNavButtons();
        this._registerDraggableBar();
        this.evalLog = null;
        this.requestLog = [];
        this.requestLogInterval = null;

        chrome.devtools.network.onRequestFinished.addListener(request => {
            lively4Panel.requestLog.push(request);
        });

        // open port to background page, so that we can execute code in this context
        this.portToBackground = chrome.runtime.connect({name: 'PanelToBackground'});
        this.portToBackground.onMessage.addListener((message) => {
            this.portToBackground.postMessage({
                id: message.id,
                result: {
                    code: message.code,
                    result: eval('(' + message.code + ')()')
                }
            });
        });
    }

    static _initTemplate(templateId) {
        var content = document.querySelector('#' + templateId + '-template');
        var main = document.querySelector('#main');
        var clone = document.importNode(content.content, true);
        main.innerHTML = '';
        main.appendChild(clone);
        var cb = Lively4Panel._initializers[templateId];
        if (cb) cb();
    }

    _registerDraggableBar() {
        var bar = document.querySelector('#drag-n-drop');
        var nav = document.querySelector('#nav');
        var main = document.querySelector('#main');
        var moveMouse = false;

        document.addEventListener('mousedown', function(event) {
            var barRect = bar.getBoundingClientRect();
            if (barRect.top <= event.clientY && barRect.bottom >= event.clientY &&
                barRect.left <= event.clientX && barRect.right >= event.clientX) {
                moveMouse = true;
                // Prevents unintented behavior for drag over
                event.preventDefault();
            }
        });

        document.addEventListener('mousemove', function() {
            if (moveMouse) {
                nav.style.width = event.clientX;
                main.style.width = (document.body.clientWidth - parseInt(nav.style.width,10)) + 'px';
            }
        });

        document.addEventListener('mouseup', function() {
            moveMouse = false;
        });

        document.addEventListener('mouseleave', function() {
            moveMouse = false;
        });
    }

    _registerNavButtons() {
        var navButtons = document.getElementsByClassName('nav-button');

        var clickHandler = function() {
            var oldSelection = document.getElementsByClassName('selected')[0];
            oldSelection.classList.remove('selected');
            this.classList.add('selected');
            Lively4Panel._initTemplate(this.id);
        };

        for (var i = 0; i < navButtons.length; i++) {
            navButtons[i].addEventListener('click', clickHandler.bind(navButtons[i]));
        }

        var initButton = document.getElementsByClassName('selected')[0];
        Lively4Panel._initTemplate(initButton.id);
    }

    networkContent() {
        let table = document.createElement('table');
        table.classList.add('panel-table');
        let thead = document.createElement('thead');
        let theadrow = document.createElement('tr');
        theadrow.appendChild(lively4Panel._newCell('URL'));
        theadrow.appendChild(lively4Panel._newCell('Method'));
        theadrow.appendChild(lively4Panel._newCell('Time'));
        theadrow.appendChild(lively4Panel._newCell('Response Status'));
        thead.appendChild(theadrow);
        table.appendChild(thead);
        let tbody = document.createElement('tbody');
        this.requestLog.forEach(function(request) {
            let row = document.createElement('tr');
            row.classList.add('table-row');
            row.appendChild(lively4Panel._newCell(request.request.url));
            row.appendChild(lively4Panel._newCell(request.request.method));
            row.appendChild(lively4Panel._newCell(Math.round(request.time) + 'ms'));
            row.appendChild(lively4Panel._newCell(request.response.status));
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        return table;
    }

    _newCell(text) {
        let col = document.createElement('td');
        col.innerHTML = text;
        col.classList.add('table-cell');
        return col;
    }
}

var lively4Panel = new Lively4Panel();
