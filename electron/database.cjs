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
 * Create the original table if it doesn't exist.
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
 * Database migration
 *
 * Add new columns to existing databases
 * without deleting existing tasks.
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
 * Get all tasks
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
 * Add a new task
 */
function addTask(title, priority,dueDate) {
  const statement = db.prepare(`
    INSERT INTO tasks (
      title,
      priority,
      status,
      completed,
      created_at,
      updated_at,
      due_Date
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

  const result = statement.run(title, priority,dueDate || null,);

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
      WHERE id = ?
    `,
    )
    .get(result.lastInsertRowid);
}

/*
 * Change task status
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
        updated_at
      FROM tasks
      WHERE id = ?
    `,
    )
    .get(id);
}

/*
 * Keep existing toggle functionality working.
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
 * Update task details
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
        updated_at
      FROM tasks
      WHERE id = ?
    `,
    )
    .get(id);
}

/*
 * Delete task
 */
function deleteTask(id) {
  const statement = db.prepare(`
    DELETE FROM tasks
    WHERE id = ?
  `);

  const result = statement.run(id);

  return result.changes > 0;
}

module.exports = {
  databasePath,
  getTasks,
  addTask,
  toggleTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
};
