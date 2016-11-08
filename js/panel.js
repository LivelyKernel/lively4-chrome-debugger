function Lively4Panel() {
    this.backgroundPageConnection = chrome.runtime.connect({
    	name: "panel"
    });

    this.backgroundPageConnection.postMessage({
    	name: 'init',
    	tabId: chrome.devtools.inspectedWindow.tabId
    });

    this.registerOpenSync();
    this._registerNavButtons();
}

Lively4Panel.prototype = {
	registerOpenSync: function()
	{
		document.getElementById("open-sync-window").addEventListener("click", function() {
    		exec(() => lively.openComponentInWindow('lively-sync'));
    	});
	},

	_registerNavButtons: function()
	{
		var navButtons = document.getElementsByClassName("nav-button");

		for (var i = 0; i < navButtons.length; i++) {
  			navButtons[i].addEventListener("click", function() {
    			var oldSelection = document.getElementsByClassName("selected");
    			oldSelection[0].className = "nav-button";
    			this.className += " selected";

    			var content = document.querySelector("#" + this.id + "-template");
    			var main = document.querySelector("#main");
    			var clone = document.importNode(content.content, true);
    			main.innerHTML = "";
  				main.appendChild(clone);
  			});
		}
	}
};

var lively4Panel = new Lively4Panel();
