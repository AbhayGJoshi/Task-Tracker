const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("taskAPI", {
  // =========================
  // TASK APIs
  // =========================

  getTasks: () => ipcRenderer.invoke("tasks:get"),

  addTask: (title, priority, dueDate) =>
    ipcRenderer.invoke("tasks:add", {
      title,
      priority,
      dueDate,
    }),

  toggleTask: (id) => ipcRenderer.invoke("tasks:toggle", id),

  updateStatus: (id, status) =>
    ipcRenderer.invoke("tasks:status", {
      id,
      status,
    }),

  updateTask: (id, title, priority) =>
    ipcRenderer.invoke("tasks:update", {
      id,
      title,
      priority,
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
});
