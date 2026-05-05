const { app, BrowserWindow } = require('electron');
const path = require('path');
const { shell, ipcMain } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,  // Kullanıcı en fazla bu kadar küçültebilir
    minHeight: 700, // Kullanıcı en fazla bu kadar küçültebilir
    icon: path.join(__dirname, 'icon.png'), // Uygulama ikonu
    webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true, // Güvenlik için true kalsın
    nodeIntegration: false,
    sandbox: false // İŞTE BU! fs modülünün preload'da çalışması için bunu ekle
    }
  });

  win.setMenu(null); // Menüyü kapat

  win.loadFile('index.html');
  // İstersen geliştirici araçlarını (Console) kapatmak için alttaki satırı yorum satırı yapabilirsin
  // win.webContents.openDevTools(); 
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('open-url', (event, url) => {
    shell.openExternal(url);
});