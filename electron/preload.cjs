const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("taskAPI", {
  // =========================
  // TASK APIs
  // =========================

  getTasks: () => ipcRenderer.invoke("tasks:get"),

  addTask: (title, priority, dueDate, createdAt, status) =>
    ipcRenderer.invoke("tasks:add", {
      title,
      priority,
      dueDate,
      createdAt,
      status,
    }),

  toggleTask: (id) => ipcRenderer.invoke("tasks:toggle", id),

  updateStatus: (id, status) =>
    ipcRenderer.invoke("tasks:status", {
      id,
      status,
    }),

  updateTask: (id, title, priority, createdAt) =>
    ipcRenderer.invoke("tasks:update", {
      id,
      title,
      priority,
      createdAt,
    }),

  deleteTask: (id) => ipcRenderer.invoke("tasks:delete", id),

  // =========================
  // TASK UPDATE APIs
  // =========================

  getTaskUpdates: (taskId) => ipcRenderer.invoke("task-updates:get", taskId),

  addTaskUpdate: (taskId, updateText) =>
    ipcRenderer.invoke("task-updates:add", {
      taskId,
      updateText,
    }),

  updateTaskUpdate: (updateId, updateText) =>
    ipcRenderer.invoke("task-updates:update", {
      updateId,
      updateText,
    }),

  deleteTaskUpdate: (updateId) =>
    ipcRenderer.invoke("task-updates:delete", updateId),

  // =========================
  // DATABASE APIs
  // =========================

  backupDatabase: () => ipcRenderer.invoke("database:backup"),

  restoreDatabase: () => ipcRenderer.invoke("database:restore"),

  resetDatabase: () => ipcRenderer.invoke("database:reset"),
});
