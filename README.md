# lively4-chrome-debugger

## Abstract
The Lively4 Chrome Debugger aims to provide an IDE like debugger for Lively4. It consists of two major parts: a Chrome extension and the debugger UI. The extension exposes a *lively4ChromeDebugger* object to the Lively4 page in order to have access to the chrome.\* API, which is required by the debugger. <br>
The main task of the object is to expose the chrome.debugger API and offer convenience methods for functions like getting all debuggable scripts or attaching the debugger to a page. Furthermore the object is able to send generic commands to the chrome API in order to access the whole range of functions available through the interface. Every call returns a Promise, that contains the execution result after the asynchronous request is finished.<br>
The debugger can be accessed from the Lively4 context menu. After selecting a debuggee standard debugging buttons like step into and over are displayed. Any command can be executed automatically a chosen number of times with a given step speed. Additionally users can edit code live without reloading the page. Changes will be taken into account by the following statements. Besides the debugger offers a basic profiler. 

## Installation Instructions
1. Clone the repository
2. Activate the developer mode in Google Chrome
3. Click on "Load unpacked extension…" and choose the cloned folder (The extension should be loaded and active now)
4. Reload the Lively4 page 
  * The extension exposes a *lively4ChromeDebugger* object
  * The debugger UI should be working

## Links
- [Chrome Debugging Protocol Viewer][debugging_protocol]
- [Message Passing in Chrome][message_passing]
- [Context of different scripts][script_context] // Explains the different aspects of every context available in a chrome extension

[debugging_protocol]: https://chromedevtools.github.io/debugger-protocol-viewer/1-2/Debugger/
[message_passing]: https://developer.chrome.com/extensions/messaging
[script_context]: http://stackoverflow.com/a/9916089
