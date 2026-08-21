import type { Priority, Task, TaskStatus } from "./types";

export {};

declare global {
  interface Window {
    taskAPI: {
      getTasks: () => Promise<Task[]>;

      addTask: (
        title: string,
        priority: Priority,
        dueDate: string | null,
      ) => Promise<Task>;

      toggleTask: (id: number) => Promise<Task | null>;

      updateStatus: (id: number, status: TaskStatus) => Promise<Task | null>;

      updateTask: (
        id: number,
        title: string,
        priority: Priority,
      ) => Promise<Task | null>;

      deleteTask: (id: number) => Promise<boolean>;
    };
  }
}
