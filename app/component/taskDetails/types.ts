export interface AssignedUserTaskResult {
  userId: number;
  userName: string;
  taskId?: number;
  taskName: string;
  numberOfResultDays: number;
}

// getTaskGenreData が返す1件。ジャンルの無いタスクは taskGenreId などが無い
export interface TaskGenreDetail {
  taskId: number;
  taskGenreId?: number;
  taskGenreName?: string;
  numberOfPersons?: number;
  startDate?: string;
  deadlineDate?: string;
  numberOfDays?: number;
  assignedUserTaskResultData: AssignedUserTaskResult[];
}

export interface AttachedFileData {
  file: File;
  url: string;
}
