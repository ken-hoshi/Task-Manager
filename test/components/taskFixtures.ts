// 部品のテストで使うタスクとジャンルのデータ（Supabase から返る形に合わせる）
export const statuses = [
  { id: 1, status: "Not Started" },
  { id: 2, status: "Processing" },
  { id: 3, status: "Completed" },
];

export const task = {
  id: 1,
  task_name: "画面",
  status_id: 2,
  task_status: { status: "Processing" },
  start_date: "2024-04-01",
  deadline_date: "2024-04-03",
  number_of_days: 3,
  details: "",
  assigned_user_id: 5,
  users: { name: "星" },
  task_genre_id: 7,
  small_project_id: 1,
  number_of_result_days: 2,
  small_projects: {
    isFinished: false,
    small_project_name: "SP",
    projects: { project_name: "P" },
  },
};

// getTaskGenreData が返す形
export const genre = {
  taskId: 1,
  taskGenreId: 7,
  taskGenreName: "設計",
  numberOfPersons: 2,
  startDate: "2024-04-01",
  deadlineDate: "2024-04-05",
  numberOfDays: 5,
  assignedUserTaskResultData: [
    { userId: 5, userName: "星", taskId: 1, taskName: "画面", numberOfResultDays: 2 },
    { userId: 6, userName: "田中", taskId: 2, taskName: "API", numberOfResultDays: 3 },
    { userId: 5, userName: "星", taskId: 3, taskName: "DB", numberOfResultDays: 1 },
  ],
};
