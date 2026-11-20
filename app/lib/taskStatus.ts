// タスクのステータス。DB（task_status 表）の名前は英語のまま変えず、画面に出すときに日本語にする（UI 台帳 決定2・23）
export const TASK_STATUS_LABELS: Record<number, string> = {
  1: "未着手",
  2: "進行中",
  3: "完了",
};

// 状態ごとの色（app/globals.css の変数）を使う Tailwind のクラス
export const TASK_STATUS_DOT_CLASSES: Record<number, string> = {
  1: "bg-status-todo",
  2: "bg-status-doing",
  3: "bg-status-done",
};

// id に対応する日本語名。知らない id のときは DB の名前をそのまま出す
export const taskStatusLabel = (statusId: number, dbName?: string) =>
  TASK_STATUS_LABELS[statusId] ?? dbName ?? "";

// 「完了」の status_id。未完了かどうかは、表示名（"Completed"）ではなくこの id で決める
export const COMPLETED_STATUS_ID = 3;

export const isUnfinished = (task: { status_id: number }) =>
  task.status_id !== COMPLETED_STATUS_ID;
