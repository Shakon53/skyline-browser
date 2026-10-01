const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  newPrivateWindow: () => ipcRenderer.invoke('browser:new-private'),
  clearData: (partition) => ipcRenderer.invoke('browser:clear-data', partition),
  downloadAction: (payload) => ipcRenderer.invoke('download:action', payload),
  onDownload: (callback) => ipcRenderer.on('download:update', (_event, payload) => callback(payload))
});
