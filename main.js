const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 720,
        fullscreen: true, // Start in Fullscreen
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'icon.png'), // If you have an icon
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    win.loadFile('index.html');

    // F11 Toggle Logic
    win.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F11' && input.type === 'keyDown') {
            win.setFullScreen(!win.isFullScreen());
            event.preventDefault();
        }
    });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });