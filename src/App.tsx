import { useEffect, useState } from "react";
import "./index.css";
import type { Priority, Task, TaskStatus } from "./types";

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    async function loadTasks() {
      try {
        const savedTasks = await window.taskAPI.getTasks();
        setTasks(savedTasks);
      } catch (error) {
        console.error("Failed to load tasks:", error);
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, []);

  const totalTasks = tasks.length;

  const pendingTasks = tasks.filter((task) => !task.completed).length;

  const completedTasks = tasks.filter((task) => task.completed).length;

  async function addTask() {
    const title = taskTitle.trim();

    if (!title) {
      return;
    }

    try {
      const newTask = await window.taskAPI.addTask(
        title,
        priority,
        dueDate || null,
      );

      setTasks((currentTasks) => [newTask, ...currentTasks]);

      setTaskTitle("");
      setPriority("Medium");
      setDueDate("");
      setShowAddTask(false);
    } catch (error) {
      console.error("Failed to add task:", error);
    }
  }

  async function toggleTask(id: number) {
    try {
      const result = await window.taskAPI.toggleTask(id);

      if (!result) {
        return;
      }

      setTasks((currentTasks) =>
        currentTasks.map((task) => (task.id === id ? result : task)),
      );
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  }

  async function changeStatus(id: number, status: TaskStatus) {
    try {
      const result = await window.taskAPI.updateStatus(id, status);

      if (!result) {
        return;
      }

      setTasks((currentTasks) =>
        currentTasks.map((task) => (task.id === id ? result : task)),
      );
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  }

  async function saveEditedTask() {
    if (!editingTask) {
      return;
    }

    const title = editingTask.title.trim();

    if (!title) {
      return;
    }

    try {
      const result = await window.taskAPI.updateTask(
        editingTask.id,
        title,
        editingTask.priority,
      );

      if (!result) {
        return;
      }

      // If status was also changed while editing,
      // update it separately.
      let finalTask = result;

      if (editingTask.status !== result.status) {
        const statusResult = await window.taskAPI.updateStatus(
          editingTask.id,
          editingTask.status,
        );

        if (statusResult) {
          finalTask = statusResult;
        }
      }

      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === finalTask.id ? finalTask : task,
        ),
      );

      setEditingTask(null);
    } catch (error) {
      console.error("Failed to save task:", error);
    }
  }

  async function confirmDeleteTask() {
    if (!deletingTask) {
      return;
    }

    try {
      const success = await window.taskAPI.deleteTask(deletingTask.id);

      if (!success) {
        return;
      }

      setTasks((currentTasks) =>
        currentTasks.filter((task) => task.id !== deletingTask.id),
      );

      setDeletingTask(null);
      setOpenMenuId(null);
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString.replace(" ", "T") + "Z").toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <span className="logo-icon">✓</span>
          <span>Task Tracker</span>
        </div>

        <nav className="navigation">
          <button className="nav-item active">
            <span>⌂</span>
            Dashboard
          </button>

          <button className="nav-item">
            <span>☷</span>
            Tasks
          </button>

          <button className="nav-item">
            <span>▣</span>
            Today
          </button>

          <button className="nav-item">
            <span>★</span>
            Important
          </button>

          <button className="nav-item">
            <span>▦</span>
            Categories
          </button>
        </nav>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>Dashboard</h1>
            <p>Manage your everyday tasks</p>
          </div>

          <div className="topbar-actions">
            <button className="icon-button">⌕</button>
            <button className="icon-button">⚙</button>
          </div>
        </header>

        <section className="welcome">
          <h2>Good Morning 👋</h2>
          <p>Here is an overview of your tasks.</p>
        </section>

        <section className="statistics">
          <div className="stat-card">
            <div className="stat-icon">☷</div>
            <div>
              <span>Total Tasks</span>
              <strong>{totalTasks}</strong>
            </div>
          </div>

          <div className="stat-card completed-stat">
            <div className="stat-icon">✓</div>
            <div>
              <span>Completed</span>
              <strong>{completedTasks}</strong>
            </div>
          </div>

          <div className="stat-card pending-stat">
            <div className="stat-icon">◷</div>
            <div>
              <span>Pending</span>
              <strong>{pendingTasks}</strong>
            </div>
          </div>
        </section>

        <section className="tasks-section">
          <div className="section-header">
            <div>
              <h2>Today's Tasks</h2>
              <p>Tasks that need your attention</p>
            </div>

            <button
              className="add-task-button"
              onClick={() => setShowAddTask(true)}
            >
              + Add Task
            </button>
          </div>

          <div className="task-list">
            {loading ? (
              <p>Loading tasks...</p>
            ) : tasks.length === 0 ? (
              <p>No tasks yet. Add your first task.</p>
            ) : (
              tasks.map((task) => (
                <div
                  className={`task-card ${task.completed ? "completed" : ""}`}
                  key={task.id}
                >
                  <button
                    className="task-check"
                    onClick={() => toggleTask(task.id)}
                    aria-label={`Mark ${task.title} as ${
                      task.completed ? "pending" : "completed"
                    }`}
                  >
                    {task.completed ? "✓" : ""}
                  </button>

                  <div className="task-details">
                    <h3>{task.title}</h3>

                    <span className={`priority ${task.priority.toLowerCase()}`}>
                      {task.priority}
                    </span>
                    <select
                      className={`status-select status-${task.status
                        .toLowerCase()
                        .replace(" ", "-")}`}
                      value={task.status}
                      onChange={(event) =>
                        changeStatus(task.id, event.target.value as TaskStatus)
                      }
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>

                    <div className="task-meta">
                      <span>
                        📅 Due:{" "}
                        {task.due_date
                          ? new Date(
                              task.due_date + "T00:00:00",
                            ).toLocaleDateString()
                          : "No due date"}
                      </span>

                      <span>
                        🕐 Created:{" "}
                        {new Date(
                          task.created_at.replace(" ", "T"),
                        ).toLocaleString()}
                      </span>

                      <span>
                        🔄 Updated:{" "}
                        {new Date(
                          task.updated_at.replace(" ", "T"),
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="task-menu-container">
                    <button
                      className="more-button"
                      onClick={() =>
                        setOpenMenuId(openMenuId === task.id ? null : task.id)
                      }
                    >
                      •••
                    </button>

                    {openMenuId === task.id && (
                      <div className="task-menu">
                        <button
                          onClick={() => {
                            setEditingTask(task);
                            setOpenMenuId(null);
                          }}
                        >
                          ✏ Edit
                        </button>

                        <button
                          className="delete-menu-item"
                          onClick={() => {
                            setDeletingTask(task);
                            setOpenMenuId(null);
                          }}
                        >
                          🗑 Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {showAddTask && (
        <div className="modal-overlay" onClick={() => setShowAddTask(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Add Task</h2>
                <p>Create a new task</p>
              </div>

              <button
                className="modal-close"
                onClick={() => setShowAddTask(false)}
              >
                ×
              </button>
            </div>

            <div className="form-group">
              <label htmlFor="task-title">Task</label>

              <input
                id="task-title"
                type="text"
                placeholder="Enter task name"
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    addTask();
                  }
                }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="task-priority">Priority</label>

              <select
                id="task-priority"
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as Priority)
                }
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="task-due-date">Due Date</label>

              <input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={() => setShowAddTask(false)}
              >
                Cancel
              </button>

              <button
                className="save-button"
                onClick={addTask}
                disabled={!taskTitle.trim()}
              >
                Save Task
              </button>
            </div>
          </div>
        </div>
      )}

      {editingTask && (
        <div className="modal-overlay" onClick={() => setEditingTask(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Edit Task</h2>
                <p>Update your task</p>
              </div>

              <button
                className="modal-close"
                onClick={() => setEditingTask(null)}
              >
                ×
              </button>
            </div>

            <div className="form-group">
              <label htmlFor="edit-task-title">Task</label>

              <input
                id="edit-task-title"
                type="text"
                value={editingTask.title}
                onChange={(event) =>
                  setEditingTask({
                    ...editingTask,
                    title: event.target.value,
                  })
                }
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-task-priority">Priority</label>

              <select
                id="edit-task-priority"
                value={editingTask.priority}
                onChange={(event) =>
                  setEditingTask({
                    ...editingTask,
                    priority: event.target.value as Priority,
                  })
                }
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="edit-task-status">Status</label>

              <select
                id="edit-task-status"
                value={editingTask.status}
                onChange={(event) =>
                  setEditingTask({
                    ...editingTask,
                    status: event.target.value as Task["status"],
                  })
                }
              >
                <option value="Pending">Pending</option>

                <option value="In Progress">In Progress</option>

                <option value="Completed">Completed</option>

                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="task-edit-info">
              <div>
                <strong>Created:</strong> {formatDate(editingTask.created_at)}
              </div>

              <div>
                <strong>Updated:</strong> {formatDate(editingTask.updated_at)}
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={() => setEditingTask(null)}
              >
                Cancel
              </button>

              <button
                className="save-button"
                onClick={saveEditedTask}
                disabled={!editingTask.title.trim()}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingTask && (
        <div className="modal-overlay" onClick={() => setDeletingTask(null)}>
          <div
            className="modal delete-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Delete Task</h2>
                <p>Are you sure you want to delete this task?</p>
              </div>

              <button
                className="modal-close"
                onClick={() => setDeletingTask(null)}
              >
                ×
              </button>
            </div>

            <div className="delete-message">
              <strong>"{deletingTask.title}"</strong>

              <p>This action cannot be undone.</p>
            </div>

            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={() => setDeletingTask(null)}
              >
                Cancel
              </button>

              <button className="delete-button" onClick={confirmDeleteTask}>
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
