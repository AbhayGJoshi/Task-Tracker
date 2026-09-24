const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

const {
  getTasks,
  addTask,
  toggleTask,
  updateTask,
  updateTaskStatus,
  deleteTask,

  // Task Updates
  getTaskUpdates,
  addTaskUpdate,
  updateTaskUpdate,
  deleteTaskUpdate,
} = require("./database.cjs");

let mainWindow;

function createWindow() {
  const iconPath = path.join(__dirname, "..", "build", "icon.ico");

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,

    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

if (!app.isPackaged && !require("fs").existsSync(path.join(process.resourcesPath, "app", "dist", "index.html"))) {
    // Development
    mainWindow.loadURL("http://localhost:5173");

    // Development only
    mainWindow.webContents.openDevTools();
  } else {
    // Production / Installed application
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
    mainWindow.webContents.openDevTools();
  }
}

/*
 * IPC: Tasks
 */

ipcMain.handle("tasks:get", () => {
  return getTasks();
});

ipcMain.handle("tasks:add", (_event, { title, priority, dueDate, createdAt, status }) => {
  return addTask(title, priority, dueDate, createdAt, status);
});

ipcMain.handle("tasks:toggle", (_event, id) => {
  return toggleTask(id);
});

ipcMain.handle("tasks:status", (_event, { id, status }) => {
  return updateTaskStatus(id, status);
});

ipcMain.handle("tasks:update", (_event, { id, title, priority, createdAt }) => {
  return updateTask(id, title, priority, createdAt);
});

ipcMain.handle("tasks:delete", (_event, id) => {
  return deleteTask(id);
});

ipcMain.handle("task-updates:get", (_event, taskId) => {
  return getTaskUpdates(taskId);
});

ipcMain.handle("task-updates:add", (_event, { taskId, updateText }) => {
  return addTaskUpdate(taskId, updateText);
});

ipcMain.handle("task-updates:update", (_event, { updateId, updateText }) => {
  return updateTaskUpdate(updateId, updateText);
});

ipcMain.handle("task-updates:delete", (_event, updateId) => {
  return deleteTaskUpdate(updateId);
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
