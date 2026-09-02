type TaskUpdate = {
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
      ) => Promise<Task>;

      toggleTask: (id: number) => Promise<Task>;

      updateStatus: (id: number, status: TaskStatus) => Promise<Task>;

      updateTask: (
        id: number,
        title: string,
        priority: Priority,
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
