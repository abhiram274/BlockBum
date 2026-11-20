const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('allow-file-access-from-files');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: "BlockBum Network - Decentralized Platform & Node Client",
    backgroundColor: '#090d16',
    autoHideMenuBar: false,
    show: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false,
      webSecurity: false
    }
  });

  win.webContents.on('console-message', (event) => {
    // In newer Electron, event contains { level, message, lineNumber, sourceId }
    const msg = event.message || event;
    console.log(`[Renderer Console] ${msg}`);
  });

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Load Failed] ${errorCode}: ${errorDescription} URL: ${validatedURL}`);
  });

  win.webContents.on('render-process-gone', (event, details) => {
    console.error(`[Render Process Gone] Reason: ${details.reason}, exitCode: ${details.exitCode}`);
  });

  win.loadFile(path.join(__dirname, 'dist', 'index.html'));

  win.once('ready-to-show', () => {
    win.show();
    win.focus();
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
