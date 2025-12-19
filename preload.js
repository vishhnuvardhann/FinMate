// preload.js

const { contextBridge, ipcRenderer } = require("electron");

// Expose limited, safe API to the renderer
contextBridge.exposeInMainWorld("api", {
  ping: () => ipcRenderer.invoke("ping")
});
