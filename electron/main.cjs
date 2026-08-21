const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

const {
  getTasks,
  addTask,
  toggleTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
} = require("./database.cjs");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,

    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL("http://localhost:5173");

  // Development only
  mainWindow.webContents.openDevTools();
}

/*
 * IPC: Tasks
 */

ipcMain.handle("tasks:get", () => {
  return getTasks();
});


ipcMain.handle(
  "tasks:add",
  (_event, { title, priority, dueDate }) => {
    return addTask(
      title,
      priority,
      dueDate,
    );
  },
);

ipcMain.handle("tasks:toggle", (_event, id) => {
  return toggleTask(id);
});

ipcMain.handle("tasks:status", (_event, { id, status }) => {
  return updateTaskStatus(id, status);
});

ipcMain.handle("tasks:update", (_event, { id, title, priority }) => {
  return updateTask(id, title, priority);
});

ipcMain.handle("tasks:delete", (_event, id) => {
  return deleteTask(id);
});
/*
 * Application lifecycle
 */

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
