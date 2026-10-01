const { app, BrowserWindow, ipcMain, session, shell } = require('electron');
const path = require('path');
const downloads = new Map();

// Avoid a GPU-process crash on this Windows graphics stack.
app.disableHardwareAcceleration();

function configureSession(partition, window) {
  const currentSession = session.fromPartition(partition);
  currentSession.setPermissionRequestHandler((_contents, permission, callback) => {
    callback(['clipboard-sanitized-write', 'fullscreen'].includes(permission));
  });
  currentSession.on('will-download', (_event, item) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    downloads.set(id, item);
    const send = (state) => window.webContents.send('download:update', {
      id,
      state,
      filename: item.getFilename(),
      url: item.getURL(),
      received: item.getReceivedBytes(),
      total: item.getTotalBytes(),
      savePath: item.getSavePath()
    });
    item.on('updated', (_e, state) => send(state));
    item.once('done', (_e, state) => { send(state); downloads.delete(id); });
    send('progressing');
  });
}

function createWindow({ incognito = false } = {}) {
  const partition = incognito ? `private:${Date.now()}` : 'persist:browser';
  const window = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 760,
    minHeight: 520,
    backgroundColor: '#0b0d12',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0b0d12',
      symbolColor: '#d8dee9',
      height: 42
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true
    }
  });

  configureSession(partition, window);
  window.loadFile(path.join(__dirname, 'renderer', 'index.html'), { query: { incognito: String(incognito), partition } });

  ipcMain.on('window:minimize', () => window.minimize());
  ipcMain.on('window:maximize', () => {
    window.isMaximized() ? window.unmaximize() : window.maximize();
  });
  ipcMain.on('window:close', () => window.close());
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

ipcMain.handle('browser:new-private', () => { createWindow({ incognito: true }); return true; });
ipcMain.handle('browser:clear-data', async (_event, partition) => {
  await session.fromPartition(partition).clearStorageData();
  await session.fromPartition(partition).clearCache();
  return true;
});
ipcMain.handle('download:action', (_event, { id, action, savePath }) => {
  const item = downloads.get(id);
  if (action === 'show' && savePath) return shell.showItemInFolder(savePath);
  if (!item) return false;
  if (action === 'pause') item.pause();
  if (action === 'resume') item.resume();
  if (action === 'cancel') item.cancel();
  return true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
