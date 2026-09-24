import { useEffect, useState } from "react";
import "./index.css";
import type { Priority, Task, TaskStatus, TaskUpdate } from "./types";

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
  const [updates, setUpdates] = useState<TaskUpdate[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [updateText, setUpdateText] = useState("");
  const [editingUpdate, setEditingUpdate] = useState<TaskUpdate | null>(null);
  const [deletingUpdate, setDeletingUpdate] = useState<TaskUpdate | null>(null);
  const [activeView, setActiveView] = useState<"Dashboard" | "Tasks" | "Today" | "Categories">("Dashboard");
  const [createdAt, setCreatedAt] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>("Pending");
  const [categoryFilter, setCategoryFilter] = useState<Priority | null>(null);
  const [taskSearch, setTaskSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "All">("All");
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      return window.localStorage.getItem("task-tracker-theme") === "dark"
        ? "dark"
        : "light";
    } catch {
      return "light";
    }
  });

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

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);

    try {
      window.localStorage.setItem("task-tracker-theme", theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  const totalTasks = tasks.length;

  const pendingTasks = tasks.filter((task) => !task.completed).length;

  const completedTasks = tasks.filter((task) => task.completed).length;

  // Keep active work at the top and completed work at the
  // bottom. Within the same status, most recently updated first.
  const statusOrder: Record<TaskStatus, number> = {
    "In Progress": 1,
    Pending: 2,
    Completed: 3,
    Cancelled: 4,
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    const statusDifference = statusOrder[a.status] - statusOrder[b.status];

    if (statusDifference !== 0) {
      return statusDifference;
    }

    const updatedDifference =
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();

    if (updatedDifference !== 0) {
      return updatedDifference;
    }

    return b.id - a.id;
  });

  const todayKey = new Date().toLocaleDateString("en-CA");

  function taskDateKey(value: string) {
    const date = new Date(value.replace(" ", "T") + (value.endsWith("Z") ? "" : "Z"));
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-CA");
  }

  function matchesSearch(task: Task) {
    const query = taskSearch.trim().toLowerCase();
    return !query || task.title.toLowerCase().includes(query);
  }

  const visibleTasks = sortedTasks.filter((task) => {
    if (activeView === "Today" && taskDateKey(task.due_date || "") !== todayKey) {
      return false;
    }

    if (activeView === "Tasks") {
      if (categoryFilter && task.priority !== categoryFilter) return false;
      if (statusFilter !== "All" && task.status !== statusFilter) return false;
    }

    return matchesSearch(task);
  });

  const tasksViewTasks = [...visibleTasks].sort((a, b) => {
    const createdDifference =
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

    if (createdDifference !== 0) {
      return createdDifference;
    }

    return a.id - b.id;
  });

  const viewTitles = {
    Dashboard: "Dashboard",
    Tasks: "All Tasks",
    Today: "Today",
    Categories: "Categories",
  } as const;

  function getDateTimeLocal(value?: string) {
    const date = value ? new Date(value.replace(" ", "T") + (value.endsWith("Z") ? "" : "Z")) : new Date();
    if (Number.isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
  }

  function getTodayDate() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

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
        createdAt || null,
        newTaskStatus,
      );

      setTasks((currentTasks) => [newTask, ...currentTasks]);

      setTaskTitle("");
      setPriority("Medium");
      setDueDate("");
      setCreatedAt("");
      setNewTaskStatus("Pending");
      setShowAddTask(false);
    } catch (error) {
      console.error("Failed to add task:", error);
    }
  }

  async function loadTaskUpdates(taskId: number) {
    try {
      const result = await window.taskAPI.getTaskUpdates(taskId);
      setUpdates(result);
    } catch (error) {
      console.error("Failed to load task updates:", error);
    }
  }

  async function openUpdates(task: Task) {
    setSelectedTask(task);
    setUpdateText("");
    setEditingUpdate(null);
    setDeletingUpdate(null);

    await loadTaskUpdates(task.id);
  }

  function closeUpdates() {
    setSelectedTask(null);
    setUpdates([]);
    setUpdateText("");
    setEditingUpdate(null);
    setDeletingUpdate(null);
  }

  async function addTaskUpdate() {
    if (!selectedTask || !updateText.trim()) return;

    await window.taskAPI.addTaskUpdate(selectedTask.id, updateText.trim());

    setUpdateText("");

    // Refresh updates
    const refreshedUpdates = await window.taskAPI.getTaskUpdates(
      selectedTask.id,
    );

    setUpdates(refreshedUpdates);

    // Refresh tasks so the card gets the new Updated timestamp
    const refreshedTasks = await window.taskAPI.getTasks();

    setTasks(refreshedTasks);

    // Refresh selected task as well
    const refreshedTask = refreshedTasks.find(
      (task) => task.id === selectedTask.id,
    );

    if (refreshedTask) {
      setSelectedTask(refreshedTask);
    }
  }

  function startEditUpdate(update: TaskUpdate) {
    setEditingUpdate(update);
    setUpdateText(update.update_text);
  }

  async function saveEditedUpdate() {
    if (!editingUpdate || !updateText.trim() || !selectedTask) {
      return;
    }

    await window.taskAPI.updateTaskUpdate(editingUpdate.id, updateText.trim());

    // Refresh updates
    const refreshedUpdates = await window.taskAPI.getTaskUpdates(
      selectedTask.id,
    );

    setUpdates(refreshedUpdates);

    // Refresh tasks so Updated timestamp changes on the card
    const refreshedTasks = await window.taskAPI.getTasks();

    setTasks(refreshedTasks);

    // Update selected task as well
    const refreshedTask = refreshedTasks.find(
      (task) => task.id === selectedTask.id,
    );

    if (refreshedTask) {
      setSelectedTask(refreshedTask);
    }

    // Clear edit mode
    setEditingUpdate(null);
    setUpdateText("");
  }
  async function confirmDeleteUpdate() {
    if (!deletingUpdate || !selectedTask) {
      return;
    }

    try {
      const success = await window.taskAPI.deleteTaskUpdate(deletingUpdate.id);

      if (!success) {
        return;
      }

      setUpdates((current) =>
        current.filter((update) => update.id !== deletingUpdate.id),
      );

      setDeletingUpdate(null);

      // Refresh tasks so the card gets the new Updated timestamp
      const refreshedTasks = await window.taskAPI.getTasks();

      setTasks(refreshedTasks);

      // Also refresh the selected task inside the Updates modal
      const refreshedTask = refreshedTasks.find(
        (task) => task.id === selectedTask.id,
      );

      if (refreshedTask) {
        setSelectedTask(refreshedTask);
      }
    } catch (error) {
      console.error("Failed to delete task update:", error);
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
        editingTask.created_at,
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
    if (!dateString) return "";
    const normalized = dateString.endsWith("Z")
      ? dateString
      : dateString.replace(" ", "T") + "Z";
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return "Invalid date";

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function renderTaskCard(task: Task) {
    return (
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
              {formatDate(task.created_at)}
            </span>

            <span>
              🔄 Updated:{" "}
              {formatDate(task.updated_at)}
            </span>
          </div>

          {task.latest_update_text && (
            <div className="latest-update-preview">
              <span className="latest-update-label">↻</span>
              <span className="latest-update-text">
                {task.latest_update_text}
              </span>
              {task.latest_update_created_at && (
                <span className="latest-update-date">
                  {formatDate(task.latest_update_created_at)}
                </span>
              )}
            </div>
          )}
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
        <div className="task-updates-column">
          <button
            className="updates-button"
            onClick={() => openUpdates(task)}
          >
            📝 Updates
          </button>
        </div>
      </div>
    );
  }

  function renderCategorySection(category: Priority) {
    const categoryTasks = sortedTasks.filter(
      (task) => task.priority === category && matchesSearch(task),
    );

    return (
      <section className="category-section" key={category}>
        <div className="category-section-header">
          <h3>{category} priority</h3>
          <span>
            {categoryTasks.length} task{categoryTasks.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="task-list">
          {categoryTasks.length === 0 ? (
            <p>No {category.toLowerCase()} priority tasks yet.</p>
          ) : (
            categoryTasks.map((task) => renderTaskCard(task))
          )}
        </div>
      </section>
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
          {([
            ["Dashboard", "⌂"],
            ["Tasks", "☷"],
            ["Today", "▣"],
            ["Categories", "▦"],
          ] as const).map(([view, icon]) => (
            <button
              key={view}
              className={`nav-item ${activeView === view ? "active" : ""}`}
              onClick={() => {
                setActiveView(view);
                setCategoryFilter(null);
                setStatusFilter("All");
                setTaskSearch("");
                setShowSearch(false);
              }}
            >
              <span>{icon}</span>
              {view}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>{viewTitles[activeView]}</h1>
            <p>{activeView === "Dashboard" ? "Manage your everyday tasks" : "View and manage your tasks"}</p>
          </div>

          <div className="topbar-actions">
            {showSearch && (
              <input
                className="task-search topbar-search"
                type="search"
                placeholder="Search by task name..."
                value={taskSearch}
                onChange={(event) => setTaskSearch(event.target.value)}
                autoFocus
              />
            )}

            <button
              className={`icon-button ${showSearch || taskSearch ? "active" : ""}`}
              onClick={() => setShowSearch((visible) => !visible)}
              aria-label="Toggle search"
              title="Search tasks"
            >
              ⌕
            </button>

            <button
              className="icon-button"
              onClick={() => setShowSettings(true)}
              aria-label="Settings"
              title="Settings"
            >
              ⚙
            </button>
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
              <h2>{activeView === "Dashboard" ? "Today's Tasks" : viewTitles[activeView]}</h2>
              <p>{activeView === "Today" ? "Only tasks with a due date of today" : activeView === "Categories" ? (categoryFilter ? `${categoryFilter} priority tasks` : "Browse tasks by priority") : categoryFilter ? `${categoryFilter} priority tasks` : activeView === "Tasks" ? "Your complete task list" : "A quick overview of your work"}</p>
            </div>

            <button
              className="add-task-button"
              onClick={() => {
                setCreatedAt(getDateTimeLocal());
                setDueDate(getTodayDate());
                setNewTaskStatus("Pending");
                setShowAddTask(true);
              }}
            >
              + Add Task
            </button>
          </div>

          {activeView === "Tasks" && (
            <div className="task-filters">
              <div className="task-status-filters">
                {(["All", "Pending", "In Progress", "Completed", "Cancelled"] as const).map((status) => (
                  <button
                    key={status}
                    className={`filter-button ${statusFilter === status ? "active" : ""}`}
                    onClick={() => setStatusFilter(status)}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="task-list">
            {loading ? (
              <p>Loading tasks...</p>
            ) : activeView === "Categories" ? (
              <div className="category-layout">
                <div className="category-grid">
                  {(["High", "Medium", "Low"] as Priority[]).map((category) => {
                    const categoryTasks = sortedTasks.filter((task) => task.priority === category);
                    return (
                      <button
                        className={`category-card category-${category.toLowerCase()} ${
                          categoryFilter === category ? "active" : ""
                        }`}
                        key={category}
                        onClick={() => {
                          setCategoryFilter(categoryFilter === category ? null : category);
                        }}
                      >
                        <span>{category}</span>
                        <strong>{categoryTasks.length}</strong>
                        <small>priority tasks</small>
                      </button>
                    );
                  })}
                </div>

                {categoryFilter
                  ? renderCategorySection(categoryFilter)
                  : (["High", "Medium", "Low"] as Priority[]).map((category) =>
                      renderCategorySection(category),
                    )}
              </div>
            ) : visibleTasks.length === 0 ? (
              <p>{tasks.length === 0 ? "No tasks yet. Add your first task." : "No tasks match this view."}</p>
            ) : (
              (activeView === "Tasks" ? tasksViewTasks : visibleTasks).map((task) => renderTaskCard(task))
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
              <label htmlFor="task-created-at">Task Date / Created On</label>
              <input
                id="task-created-at"
                type="datetime-local"
                value={createdAt}
                onChange={(event) => setCreatedAt(event.target.value)}
              />
              <small className="form-help">Use an earlier date when entering a task that was missed from tracking.</small>
            </div>

            <div className="form-group">
              <label htmlFor="task-status">Status</label>
              <select
                id="task-status"
                value={newTaskStatus}
                onChange={(event) => setNewTaskStatus(event.target.value as TaskStatus)}
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
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
              <label htmlFor="edit-task-created-at">Task Date / Created On</label>
              <input
                id="edit-task-created-at"
                type="datetime-local"
                value={getDateTimeLocal(editingTask.created_at)}
                onChange={(event) =>
                  setEditingTask({
                    ...editingTask,
                    created_at: event.target.value,
                  })
                }
              />
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

      {selectedTask && (
        <div className="modal-overlay" onClick={closeUpdates}>
          <div
            className="modal updates-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Task Updates</h2>
                <p>{selectedTask.title}</p>
              </div>

              <button className="modal-close" onClick={closeUpdates}>
                ×
              </button>
            </div>

            <div className="updates-list">
              {updates.length === 0 ? (
                <p className="no-updates">
                  No updates yet. Add the first update below.
                </p>
              ) : (
                updates.map((update) => (
                  <div className="update-item" key={update.id}>
                    <div className="update-content">
                      <p>{update.update_text}</p>

                      <span className="update-date">
                        {formatDate(update.created_at)}
                      </span>
                    </div>

                    <div className="update-actions">
                      <button
                        className="update-edit-button"
                        onClick={() => startEditUpdate(update)}
                      >
                        ✏
                      </button>

                      <button
                        className="update-delete-button"
                        onClick={() => setDeletingUpdate(update)}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="form-group update-input-group">
              <label htmlFor="task-update">
                {editingUpdate ? "Edit Update" : "Add Update"}
              </label>

              <textarea
                id="task-update"
                placeholder="Enter task update..."
                value={updateText}
                onChange={(event) => setUpdateText(event.target.value)}
                rows={4}
              />
            </div>

            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={() => {
                  if (editingUpdate) {
                    setEditingUpdate(null);
                    setUpdateText("");
                  } else {
                    closeUpdates();
                  }
                }}
              >
                {editingUpdate ? "Cancel Edit" : "Close"}
              </button>

              <button
                className="save-button"
                onClick={editingUpdate ? saveEditedUpdate : addTaskUpdate}
                disabled={!updateText.trim()}
              >
                {editingUpdate ? "Save Update" : "Add Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingUpdate && (
        <div className="modal-overlay" onClick={() => setDeletingUpdate(null)}>
          <div
            className="modal delete-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Delete Update</h2>
                <p>Are you sure you want to delete this update?</p>
              </div>

              <button
                className="modal-close"
                onClick={() => setDeletingUpdate(null)}
              >
                ×
              </button>
            </div>

            <div className="delete-message">
              <strong>"{deletingUpdate.update_text}"</strong>

              <p>This action cannot be undone.</p>
            </div>

            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={() => setDeletingUpdate(null)}
              >
                Cancel
              </button>

              <button className="delete-button" onClick={confirmDeleteUpdate}>
                Delete Update
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

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div
            className="modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Settings</h2>
                <p>Customize the appearance</p>
              </div>

              <button
                className="modal-close"
                onClick={() => setShowSettings(false)}
              >
                ×
              </button>
            </div>

            <div className="form-group">
              <label>Theme</label>

              <div className="theme-options">
                <button
                  className={`theme-option ${theme === "light" ? "active" : ""}`}
                  onClick={() => setTheme("light")}
                >
                  <span className="theme-swatch theme-swatch-light" />
                  Light
                </button>

                <button
                  className={`theme-option ${theme === "dark" ? "active" : ""}`}
                  onClick={() => setTheme("dark")}
                >
                  <span className="theme-swatch theme-swatch-dark" />
                  Dark
                </button>
              </div>
            </div>

            <div className="modal-actions">
              <button className="save-button" onClick={() => setShowSettings(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
