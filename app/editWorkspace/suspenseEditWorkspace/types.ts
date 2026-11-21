export interface WorkspaceData {
  id: number;
  name: string;
  spaceId: string;
}

export interface WorkspaceMember {
  id: number;
  name: string;
}

export interface WorkspaceTaskGenre {
  id: number;
  taskGenreName: string;
  sortId: number;
}

// 同時に開けるフォームは1つだけ。別のフォームを開くと、開いていたものは入力ごと閉じる
export type ActiveForm =
  | { type: "name" }
  | { type: "addGenre" }
  | { type: "editGenre"; id: number }
  | null;

export const isSameForm = (a: ActiveForm, b: ActiveForm) =>
  a?.type === b?.type &&
  (a?.type !== "editGenre" || b?.type !== "editGenre" || a.id === b.id);
