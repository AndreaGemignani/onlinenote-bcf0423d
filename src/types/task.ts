export interface DailyTask {
  id: string;
  task_date: string; // YYYY-MM-DD
  title: string;
  due_time: string | null; // HH:MM:SS
  completed: boolean;
  completed_at: string | null;
}

export interface TaskOwnerInfo {
  ownerId: string;
  pairCode: string;
  telegramLinked: boolean;
  telegramUsername: string | null;
  botUsername: string | null;
  deepLink: string | null;
}
