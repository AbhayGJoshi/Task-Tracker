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
};
