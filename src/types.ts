export type Priority = "High" | "Medium" | "Low";

export type TaskStatus = "Pending" | "In Progress" | "Completed" | "Cancelled";

export type Task = {
  id: number;
  title: string;
  priority: Priority;
  status: TaskStatus;
  completed: boolean;
  created_at: string;
  updated_at: string;
  due_date: string | null;
  latest_update_text: string | null;
  latest_update_created_at: string | null;
};

export type TaskUpdate = {
  id: number;
  task_id: number;
  update_text: string;
  created_at: string;
};

declare global {
  interface Window {
    taskAPI: {
      getTasks: () => Promise<Task[]>;

      addTask: (
        title: string,
        priority: Priority,
        dueDate: string | null,
        createdAt: string | null,
        status: TaskStatus,
      ) => Promise<Task>;

      toggleTask: (id: number) => Promise<Task>;

      updateStatus: (id: number, status: TaskStatus) => Promise<Task>;

      updateTask: (
        id: number,
        title: string,
        priority: Priority,
        createdAt: string,
      ) => Promise<Task>;

      deleteTask: (id: number) => Promise<boolean>;

      getTaskUpdates: (taskId: number) => Promise<TaskUpdate[]>;

      addTaskUpdate: (
        taskId: number,
        updateText: string,
      ) => Promise<TaskUpdate | null>;

      updateTaskUpdate: (
        updateId: number,
        updateText: string,
      ) => Promise<TaskUpdate | null>;

      deleteTaskUpdate: (updateId: number) => Promise<boolean>;
    };
  }
}

export {};
