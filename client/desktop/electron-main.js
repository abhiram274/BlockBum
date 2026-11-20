const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// Disable hardware acceleration to eliminate blank black screens on Windows GPU drivers
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('allow-file-access-from-files');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: "BlockBum Core - Decentralized Client & Platform",
    backgroundColor: '#090d16',
    autoHideMenuBar: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false,
      webSecurity: false
    }
  });

  // Handle keyboard shortcuts (F12 / Ctrl+Shift+I for DevTools, Ctrl+R / F5 for reload)
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
    if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) {
      win.reload();
      event.preventDefault();
    }
  });

  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const text = typeof event === 'object' && event.message ? event.message : message || event;
    console.log(`[Renderer Console] ${text}`);
  });

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Load Failed] ${errorCode}: ${errorDescription} URL: ${validatedURL}`);
  });

  win.webContents.on('render-process-gone', (event, details) => {
    console.error(`[Render Process Gone] Reason: ${details.reason}, exitCode: ${details.exitCode}`);
  });

  const distIndex = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(distIndex)) {
    win.loadFile(distIndex);
  } else {
    console.warn(`[BlockBum] dist/index.html not found! Serving build reminder.`);
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <!DOCTYPE html>
      <html>
        <head><title>BlockBum - Build Required</title></head>
        <body style="background:#090d16; color:#f1f5f9; font-family:sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0;">
          <h2 style="color:#38bdf8;">BlockBum Core Desktop</h2>
          <p>Frontend assets are not yet compiled.</p>
          <p>Please run: <code>npm run build</code> in <code>client/desktop</code> or use <code>launch-desktop.bat</code>.</p>
        </body>
      </html>
    `)}`);
  }

  win.once('ready-to-show', () => {
    win.show();
    win.focus();
  });
}

// Build application menu with DevTools and Reload options
const template = [
  {
    label: 'File',
    submenu: [
      { role: 'quit', label: 'Exit BlockBum' }
    ]
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' }
    ]
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools', label: 'Toggle Developer Tools (F12)' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
      { role: 'close' }
    ]
  }
];

app.whenReady().then(() => {
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

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
