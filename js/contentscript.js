var s = document.createElement('script');
s.src = chrome.extension.getURL('js/script.js');
(document.head||document.documentElement).appendChild(s);
s.onload = function() {
    s.remove();
};

// Event listener
document.addEventListener('EvalInContentScript', function(e) {
    // e.detail contains the transferred data (can be anything, ranging
    // from JavaScript objects to strings).
    // Do something, for example:
    eval(e.detail);
});