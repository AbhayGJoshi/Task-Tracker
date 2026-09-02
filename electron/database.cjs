const Database = require("better-sqlite3");
const path = require("path");
const { app } = require("electron");
const fs = require("fs");

const dataDirectory = path.join(app.getPath("userData"), "data");
const databasePath = path.join(dataDirectory, "tasks.db");

if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, {
    recursive: true,
  });
}

const db = new Database(databasePath);

db.pragma("journal_mode = WAL");

/*
 * =========================================================
 * TASKS TABLE
 * =========================================================
 */

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'Medium',
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

/*
 * =========================================================
 * TASKS TABLE MIGRATION
 * =========================================================
 *
 * Add new columns to existing databases without
 * deleting existing tasks.
 */

const columns = db
  .prepare("PRAGMA table_info(tasks)")
  .all()
  .map((column) => column.name);

if (!columns.includes("status")) {
  db.exec(`
    ALTER TABLE tasks
    ADD COLUMN status TEXT NOT NULL DEFAULT 'Pending'
  `);
}

if (!columns.includes("updated_at")) {
  db.exec(`
    ALTER TABLE tasks
    ADD COLUMN updated_at TEXT
  `);

  db.exec(`
    UPDATE tasks
    SET updated_at = created_at
    WHERE updated_at IS NULL
  `);
}

if (!columns.includes("due_date")) {
  db.exec(`
    ALTER TABLE tasks
    ADD COLUMN due_date TEXT
  `);
}

/*
 * =========================================================
 * TASK UPDATES TABLE
 * =========================================================
 *
 * One task can have multiple updates.
 *
 * Example:
 *
 * Task 1
 *   Update 1 - 02 Sep 2026 10:30
 *   Update 2 - 02 Sep 2026 14:15
 *   Update 3 - 03 Sep 2026 09:45
 */

db.exec(`
  CREATE TABLE IF NOT EXISTS task_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    update_text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (task_id)
      REFERENCES tasks(id)
      ON DELETE CASCADE
  )
`);

/*
 * =========================================================
 * GET ALL TASKS
 * =========================================================
 */

function getTasks() {
  return db
    .prepare(
      `
      SELECT
        id,
        title,
        priority,
        status,
        completed,
        created_at,
        updated_at,
        due_date
      FROM tasks
      ORDER BY id DESC
    `,
    )
    .all()
    .map((task) => ({
      ...task,
      completed: Boolean(task.completed),
    }));
}

/*
 * =========================================================
 * GET SINGLE TASK
 * =========================================================
 */

function getTask(id) {
  const task = db
    .prepare(
      `
      SELECT
        id,
        title,
        priority,
        status,
        completed,
        created_at,
        updated_at,
        due_date
      FROM tasks
      WHERE id = ?
    `,
    )
    .get(id);

  if (!task) {
    return null;
  }

  return {
    ...task,
    completed: Boolean(task.completed),
  };
}

/*
 * =========================================================
 * ADD NEW TASK
 * =========================================================
 */

function addTask(title, priority, dueDate) {
  const statement = db.prepare(`
    INSERT INTO tasks (
      title,
      priority,
      status,
      completed,
      created_at,
      updated_at,
      due_date
    )
    VALUES (
      ?,
      ?,
      'Pending',
      0,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP,
      ?
    )
  `);

  const result = statement.run(title, priority, dueDate || null);

  return getTask(result.lastInsertRowid);
}

/*
 * =========================================================
 * CHANGE TASK STATUS
 * =========================================================
 */

function updateTaskStatus(id, status) {
  const completed = status === "Completed" ? 1 : 0;

  const statement = db.prepare(`
    UPDATE tasks
    SET
      status = ?,
      completed = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const result = statement.run(status, completed, id);

  if (result.changes === 0) {
    return null;
  }

  return getTask(id);
}

/*
 * =========================================================
 * TOGGLE TASK
 * =========================================================
 */

function toggleTask(id) {
  const task = db
    .prepare(
      `
      SELECT status
      FROM tasks
      WHERE id = ?
    `,
    )
    .get(id);

  if (!task) {
    return null;
  }

  const newStatus = task.status === "Completed" ? "Pending" : "Completed";

  return updateTaskStatus(id, newStatus);
}

/*
 * =========================================================
 * UPDATE TASK DETAILS
 * =========================================================
 */

function updateTask(id, title, priority) {
  const statement = db.prepare(`
    UPDATE tasks
    SET
      title = ?,
      priority = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const result = statement.run(title, priority, id);

  if (result.changes === 0) {
    return null;
  }

  return getTask(id);
}

/*
 * =========================================================
 * DELETE TASK
 * =========================================================
 */

function deleteTask(id) {
  const statement = db.prepare(`
    DELETE FROM tasks
    WHERE id = ?
  `);

  const result = statement.run(id);

  return result.changes > 0;
}

/*
 * =========================================================
 * TASK UPDATES
 * =========================================================
 */

/*
 * Get all updates for a task.
 *
 * Oldest update first.
 * This gives a natural sequential history.
 */

function getTaskUpdates(taskId) {
  return db
    .prepare(
      `
      SELECT
        id,
        task_id,
        update_text,
        created_at
      FROM task_updates
      WHERE task_id = ?
      ORDER BY created_at ASC, id ASC
    `,
    )
    .all(taskId);
}

/*
 * Add a new update to a task.
 */

function addTaskUpdate(taskId, updateText) {
  const task = getTask(taskId);

  if (!task) {
    return null;
  }

  const timestamp = new Date().toISOString();

  const result = db
    .prepare(
      `
      INSERT INTO task_updates
        (task_id, update_text, created_at)
      VALUES
        (?, ?, ?)
    `,
    )
    .run(taskId, updateText.trim(), timestamp);

  db.prepare(
    `
    UPDATE tasks
    SET updated_at = ?
    WHERE id = ?
  `,
  ).run(timestamp, taskId);

  return db
    .prepare(
      `
      SELECT *
      FROM task_updates
      WHERE id = ?
    `,
    )
    .get(result.lastInsertRowid);
}

/*
 * Edit an existing task update.
 */

function updateTaskUpdate(updateId, updateText) {
  const update = db
    .prepare(
      `
      SELECT *
      FROM task_updates
      WHERE id = ?
    `,
    )
    .get(updateId);

  if (!update) {
    return null;
  }

  const timestamp = new Date().toISOString();

  db.prepare(
    `
    UPDATE task_updates
    SET update_text = ?
    WHERE id = ?
  `,
  ).run(updateText.trim(), updateId);

  db.prepare(
    `
    UPDATE tasks
    SET updated_at = ?
    WHERE id = ?
  `,
  ).run(timestamp, update.task_id);

  return db
    .prepare(
      `
      SELECT *
      FROM task_updates
      WHERE id = ?
    `,
    )
    .get(updateId);
}

/*
 * Delete a task update.
 */

function deleteTaskUpdate(updateId) {
  const existingUpdate = db
    .prepare(
      `
      SELECT
        id,
        task_id
      FROM task_updates
      WHERE id = ?
    `,
    )
    .get(updateId);

  if (!existingUpdate) {
    return false;
  }

  const statement = db.prepare(`
    DELETE FROM task_updates
    WHERE id = ?
  `);

  const result = statement.run(updateId);

  if (result.changes > 0) {
    db.prepare(
      `
      UPDATE tasks
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    ).run(existingUpdate.task_id);
  }

  return result.changes > 0;
}

/*
 * =========================================================
 * EXPORTS
 * =========================================================
 */

module.exports = {
  databasePath,

  // Tasks
  getTasks,
  getTask,
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
};
