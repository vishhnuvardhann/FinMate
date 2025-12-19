const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "FinMate Desktop",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),  // ✅ Added
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load your live website
  win.loadURL("https://finmatefinance.me");

  // Optional: open devtools
  // win.webContents.openDevTools();
}

// ✅ Safe IPC handler for the preload file
ipcMain.handle("ping", () => "pong");

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
