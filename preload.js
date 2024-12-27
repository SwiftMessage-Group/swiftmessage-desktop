const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    minimize: () => ipcRenderer.send('minimize'),
    maximize: () => ipcRenderer.send('maximize'),
    close: () => ipcRenderer.send('close'),
    // openSettings: () => ipcRenderer.send('open-settings'),
    // saveProxySettings: (proxy) => ipcRenderer.send('save-proxy-settings', proxy),
    // clearProxySettings: () => ipcRenderer.send('clear-proxy-settings'),
    ipcRenderer: ipcRenderer
});
