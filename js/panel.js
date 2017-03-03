const PROMISE_TIMEOUT = 5000;

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

class Lively4Panel {
    constructor() {
        this._registerNavButtons();
        this._registerDraggableBar();
        this.requestLog = [];
        this.requestLogInterval = null;
        this.resolvers = {};
        this.rejecters = {};
        this.idCounter = 0;

        chrome.devtools.network.onRequestFinished.addListener(request => {
            lively4Panel.requestLog.push(request);
        });

        // open port to background page, so that code can be executed in context
        this.portToBackground = chrome.runtime.connect({
            name: 'PanelToBackground'
        });
        this.portToBackground.onMessage.addListener((message, senderPort) => {
            if (message.result) {
                this._resolveResult(message);
            } else if (message.code) {
                senderPort.postMessage({
                    id: message.id,
                    inspectedTabId: chrome.devtools.inspectedWindow.tabId,
                    result: {
                        code: message.code,
                        result: eval('(' + message.code + ')()')
                    }
                });
            } else if (message.requestType == 'GetInspectedTabId') {
                message.inspectedTabId = chrome.devtools.inspectedWindow.tabId;
                message.portType = 'Panel';
                senderPort.postMessage(message);
            } else {
                console.warn('Unhandled message:', message);
            }
        });
    }

    /* Initialization */

    _initializeTemplate(templateId) {
        var content = document.querySelector('#' + templateId + '-template');
        var main = document.querySelector('#main');
        var clone = document.importNode(content.content, true);
        main.innerHTML = '';
        main.appendChild(clone);
        var initializer = `initialize${templateId.capitalize()}`;
        if (initializer in this) {
            this[initializer].bind(this)();
        }
    }

    _registerDraggableBar() {
        var bar = document.querySelector('#drag-n-drop');
        var nav = document.querySelector('#nav');
        var main = document.querySelector('#main');
        var moveMouse = false;

        document.addEventListener('mousedown', function(event) {
            var barRect = bar.getBoundingClientRect();
            if (barRect.top <= event.clientY &&
                barRect.bottom >= event.clientY &&
                barRect.left <= event.clientX &&
                barRect.right >= event.clientX) {
                moveMouse = true;
                // Prevents unintented behavior for drag over
                event.preventDefault();
            }
        });

        document.addEventListener('mousemove', function() {
            if (moveMouse) {
                nav.style.width = event.clientX;
                main.style.width = (document.body.clientWidth - parseInt(
                    nav.style.width,10)) + 'px';
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

        var clickHandler = (e) => {
            var oldSelection = document.getElementsByClassName('selected')[0];
            oldSelection.classList.remove('selected');
            e.target.classList.add('selected');
            this._initializeTemplate(e.target.id);
        };

        for (var i = 0; i < navButtons.length; i++) {
            navButtons[i].addEventListener('click', clickHandler);
        }

        var initButton = document.getElementsByClassName('selected')[0];
        this._initializeTemplate(initButton.id);
    }

    /* Communication */

    asyncEvalInLively(userFunction) {
        return new Promise((resolve, reject) => {
            this.idCounter++;
            var promiseId = this.idCounter;
            this.resolvers[promiseId] = resolve;
            this.rejecters[promiseId] = reject;
            setTimeout(() => {
                if (promiseId in this.rejecters) {
                    this.rejecters[promiseId]({'error': 'Promise timed out.'});
                    this._deleteRejecterResolverPair(promiseId);
                }
            }, PROMISE_TIMEOUT);
            this.portToBackground.postMessage({
                id: promiseId,
                inspectedTabId: chrome.devtools.inspectedWindow.tabId,
                code: userFunction.toString(),
                requestType: 'SendToPanel', // send back to panel
                eventName: 'AsyncEvalInLively'
            });
        });
    }

    _resolveResult(message) {
        var promiseId = message.id;
        if (promiseId in this.resolvers) {
            var data = message.result;
            if (data && 'error' in data) {
                this.rejecters[promiseId](data);
            } else {
                this.resolvers[promiseId](data);
            }
            this._deleteRejecterResolverPair(promiseId);
        } else {
            console.warn('No resolver for:', message);
        }
    }

    _deleteRejecterResolverPair(promiseId) {
        delete this.rejecters[promiseId];
        delete this.resolvers[promiseId];
    }

    /* Page initializers */

    initializeNetwork() {
        if (this.requestLogInterval) return;
        this.requestLogInterval = setInterval(() => {
            let networkList = document.getElementsByClassName('network-list');
            for (let i = 0; i < networkList.length; i++) {
                networkList[i].innerHTML = '';
                networkList[i].appendChild(this.networkContent());
            }
        }, 1000);
    }

    initializeFocalstorage() {
        this.asyncEvalInLively(() => {
            return new Promise(function(resolve, reject) {
                lively.focalStorage.keys().then((keys) => {
                    lively.focalStorage.getItems().then((values) => {
                        resolve({
                            keys: keys,
                            values: values
                        });
                    });
                });
            });
        }).then((data) => {
            let focalstorageItems = document.getElementsByClassName(
                'focalstorage-data');
            for (let i = 0; i < focalstorageItems.length; i++) {
                focalstorageItems[i].innerHTML = '';
                focalstorageItems[i].appendChild(
                    this.focalStorageContent(data.result));
            }
        }).catch((error) => {
            alert('Unable to retrieve focalStorage items. Reload needed.');
        });
    }

    initializeModules() {
        evalInLively(() => {
            return Object.keys(System.loads).map(
                (ea) => ({
                    name: /[^/]*$/.exec(System.loads[ea].key)[0],
                    deps: System.loads[ea].deps,
                    registered: System.loads[ea].metadata.registered
                })
            );
        }, (res) => {
            let moduleList = document.getElementsByClassName('module-list');
            for (let i = 0; i < moduleList.length; i++) {
                moduleList[i].innerHTML = '';
                moduleList[i].appendChild(this.modulesContent(res));
            }
        });
    }

    initializeTesting() {
        var openDebuggerButton = document.getElementById('open-debugger');
        openDebuggerButton.addEventListener('click', function() {
            evalInLively(() => lively.openDebugger());
        });
        var openWorkspaceButton = document.getElementById('open-workspace');
        openWorkspaceButton.addEventListener('click', function() {
            evalInLively(() => lively.openWorkspace(''));
        });
        var openSyncButton = document.getElementById('open-sync-window');
        openSyncButton.addEventListener('click', function() {
            evalInLively(() => lively.openComponentInWindow('lively-sync'));
        });
    }

    /* Content Generation */

    networkContent() {
        return this._newTable(['URL', 'Method', 'Time', 'Response Status'],
            () => {
                var rowsAndCols = [];
                this.requestLog.forEach((request) => {
                    rowsAndCols.push([
                        request.request.url,
                        request.request.method,
                        Math.round(request.time) + 'ms',
                        request.response.status
                    ]);
                });
                return rowsAndCols;
            }
        );
    }

    focalStorageContent(keyValues) {
        return this._newTable(['Key', 'Value'], () => {
            var rowsAndCols = [];
            keyValues.keys.forEach((key, index) => {
                rowsAndCols.push([key, keyValues.values[index]]);
            });
            return rowsAndCols;
        });
    }

    modulesContent(modules) {
        return this._newTable(['Name', 'Registered', 'Dependencies'], () => {
            var rowsAndCols = [];
            modules.forEach((module) => {
                var unique_deps = module.deps.filter(function(item, pos) {
                    return module.deps.indexOf(item) == pos;
                });
                rowsAndCols.push(
                    [module.name, module.registered, unique_deps.join(', ')]);
            });
            return rowsAndCols;
        });
    }

    /* Private helpers */

    _newTable(theadList, dataFunction) {
        let table = document.createElement('table');
        table.classList.add('panel-table');
        let thead = document.createElement('thead');
        let theadrow = document.createElement('tr');
        theadList.forEach(function(theadItem) {
            theadrow.appendChild(lively4Panel._newCell(theadItem));
        });
        thead.appendChild(theadrow);
        table.appendChild(thead);
        let tbody = document.createElement('tbody');
        var data = dataFunction();
        data.forEach(function(rowItem) {
            let row = document.createElement('tr');
            row.classList.add('table-row');
            rowItem.forEach(function(colItem) {
                row.appendChild(lively4Panel._newCell(colItem));
            });
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
