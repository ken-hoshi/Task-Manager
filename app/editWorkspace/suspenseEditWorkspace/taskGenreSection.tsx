"use client";

import { Dispatch, SetStateAction, useEffect, useId, useRef, useState } from "react";
import {
  DndContext,
  KeyboardCode,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, Loader2, Pencil, Plus, Tags, Trash2, X } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { clientSupabase } from "@/app/lib/supabase/client";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { isSameForm, type ActiveForm, type WorkspaceTaskGenre } from "./types";

const ADD_BUTTON_ID = "task-genre-add";
const editButtonId = (id: number) => `task-genre-edit-${id}`;

// 掴んでいる間に読み上げる文。useSortable の data に入れた名前を使う
const announcements: Announcements = {
  onDragStart: ({ active }) => `「${active.data.current?.genreName}」を掴みました。`,
  onDragOver: ({ active, over }) =>
    over
      ? `「${active.data.current?.genreName}」は「${over.data.current?.genreName}」の位置にあります。`
      : `「${active.data.current?.genreName}」は一覧の外にあります。`,
  onDragEnd: ({ active, over }) =>
    over
      ? `「${active.data.current?.genreName}」を「${over.data.current?.genreName}」の位置に置きました。`
      : `「${active.data.current?.genreName}」を置かずに戻しました。`,
  onDragCancel: ({ active }) => `「${active.data.current?.genreName}」の移動をやめました。`,
};

const screenReaderInstructions = {
  draggable:
    "Enter か Space で掴みます。上下の矢印キーで移し、もう一度 Enter か Space で置きます。Escape か Tab でやめます。",
};

// ジャンルの追加と編集で共通のフォーム
const GenreNameForm: React.FC<{
  formLabel: string;
  initialName: string;
  saving: boolean;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}> = ({ formLabel, initialName, saving, onSubmit, onCancel }) => {
  const [name, setName] = useState(initialName);
  const inputId = useId();

  return (
    <form
      aria-label={formLabel}
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(name);
      }}
    >
      <Label htmlFor={inputId} className="sr-only">
        ジャンル名
      </Label>
      <Input
        id={inputId}
        type="text"
        required
        autoFocus
        placeholder="ジャンル名"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Button type="button" variant="ghost" size="icon-sm" aria-label="入力をやめる" onClick={onCancel}>
        <X aria-hidden />
      </Button>
      <Button type="submit" size="icon-sm" aria-label="ジャンルを保存">
        {saving ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
      </Button>
    </form>
  );
};

const GenreRow: React.FC<{
  genre: WorkspaceTaskGenre;
  isEditing: boolean;
  saving: boolean;
  deleting: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (name: string) => void;
  onDelete: () => void;
}> = ({ genre, isEditing, saving, deleting, onEdit, onCancel, onSave, onDelete }) => {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: String(genre.id),
    data: { genreName: genre.taskGenreName },
    attributes: { roleDescription: "並べ替えのボタン" },
  });
  // 付ける先は本物の button なので、role と tabIndex は要らない
  const { role: _role, tabIndex: _tabIndex, ...handleAttributes } = attributes;

  // Enter・Space の長押しで、掴んだ直後に置いてしまわないようにする
  const handleKeyDownCapture = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.repeat && (event.code === KeyboardCode.Enter || event.code === KeyboardCode.Space)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("rounded-md bg-card", isDragging && "relative z-10 opacity-60 shadow-md")}
    >
      {isEditing ? (
        <div className="px-2 py-1.5">
          <GenreNameForm
            formLabel={`「${genre.taskGenreName}」の編集`}
            initialName={genre.taskGenreName}
            saving={saving}
            onSubmit={onSave}
            onCancel={onCancel}
          />
        </div>
      ) : (
        <div className="flex items-center gap-1 py-1 pr-1 pl-1">
          <Button
            ref={setActivatorNodeRef}
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`「${genre.taskGenreName}」を並べ替え`}
            className="cursor-grab touch-none text-muted-foreground"
            {...handleAttributes}
            {...listeners}
            onKeyDownCapture={handleKeyDownCapture}
          >
            <GripVertical aria-hidden />
          </Button>
          <span className="min-w-0 flex-1 px-1 [overflow-wrap:anywhere]">{genre.taskGenreName}</span>
          <Button
            id={editButtonId(genre.id)}
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`「${genre.taskGenreName}」を編集`}
            onClick={onEdit}
          >
            <Pencil aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`「${genre.taskGenreName}」を削除`}
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            {deleting ? <Loader2 className="animate-spin" aria-hidden /> : <Trash2 aria-hidden />}
          </Button>
        </div>
      )}
    </li>
  );
};

interface TaskGenreSectionProps {
  workspaceId: number;
  genres: WorkspaceTaskGenre[];
  setGenres: Dispatch<SetStateAction<WorkspaceTaskGenre[]>>;
  activeForm: ActiveForm;
  setActiveForm: Dispatch<SetStateAction<ActiveForm>>;
}

// タスクのジャンルの追加・編集・削除・並べ替え
const TaskGenreSection: React.FC<TaskGenreSectionProps> = ({
  workspaceId,
  genres,
  setGenres,
  activeForm,
  setActiveForm,
}) => {
  const { setNotificationValue } = useNotificationContext();
  const [adding, setAdding] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const returnFocusTo = useRef<string | null>(null);
  const focusAddAfterDelete = useRef(false);
  // 保存の返事を待つ間に別のフォームへ移っていたら、そのフォームを閉じない
  const latestForm = useRef(activeForm);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // 既定では Tab で置いてしまうので、やめる操作にする
      keyboardCodes: {
        start: [KeyboardCode.Space, KeyboardCode.Enter],
        cancel: [KeyboardCode.Esc, KeyboardCode.Tab],
        end: [KeyboardCode.Space, KeyboardCode.Enter],
      },
    })
  );

  useEffect(() => {
    latestForm.current = activeForm;
  }, [activeForm]);

  // フォームを閉じると押したボタンが消えるので、決めておいたボタンへフォーカスを移す
  useEffect(() => {
    if (activeForm || !returnFocusTo.current) return;
    const target = document.getElementById(returnFocusTo.current);
    returnFocusTo.current = null;
    target?.focus();
  }, [activeForm]);

  // 行を消すと押したボタンも消える。フォーカスを失ったときだけ「追加」へ移す（別の欄に入力中なら動かさない）
  useEffect(() => {
    if (!focusAddAfterDelete.current) return;
    focusAddAfterDelete.current = false;
    const active = document.activeElement;
    if (!active || active === document.body) {
      document.getElementById(ADD_BUTTON_ID)?.focus();
    }
  }, [genres]);

  const closeForm = (form: ActiveForm, focusId: string) => {
    if (!isSameForm(latestForm.current, form)) return;
    returnFocusTo.current = focusId;
    setActiveForm(null);
  };

  const sortedGenres = [...genres].sort((a, b) => a.sortId - b.sortId);

  const handleAdd = async (name: string) => {
    setAdding(true);
    try {
      const lastSortId = genres.length > 0 ? genres[genres.length - 1].sortId : 0;

      const { data: insertedGenre, error: insertError } = await clientSupabase
        .from("workspace_task_genre")
        .insert({
          task_genre_name: name,
          workspace_id: workspaceId,
          sort_id: lastSortId + 1,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }
      if (!insertedGenre) {
        throw new Error("workspaceTaskGenreInsertData couldn't get.");
      }

      setGenres((prev) => [
        ...prev,
        {
          id: insertedGenre.id,
          taskGenreName: insertedGenre.task_genre_name,
          sortId: insertedGenre.sort_id,
        },
      ]);
      setNotificationValue({
        message: "ジャンルを追加しました。",
        color: 0,
      });
    } catch (error) {
      console.error("Error Add Task Genre Name", error);
      setNotificationValue({
        message: "ジャンルを追加できませんでした。",
        color: 1,
      });
    }
    setAdding(false);
    closeForm({ type: "addGenre" }, ADD_BUTTON_ID);
  };

  const handleUpdate = async (id: number, name: string) => {
    setSavingId(id);
    try {
      const { error: updateError } = await clientSupabase
        .from("workspace_task_genre")
        .update({ task_genre_name: name })
        .eq("id", id);

      if (updateError) {
        throw updateError;
      }

      setGenres((prev) =>
        prev.map((genre) => (genre.id === id ? { ...genre, taskGenreName: name } : genre))
      );
      setNotificationValue({
        message: "ジャンルを更新しました。",
        color: 0,
      });
    } catch (error) {
      console.error("Error Update Task Genre Name", error);
      setNotificationValue({
        message: "ジャンルを更新できませんでした。",
        color: 1,
      });
    }
    setSavingId(null);
    closeForm({ type: "editGenre", id }, editButtonId(id));
  };

  const handleDelete = async (id: number) => {
    // 以前は削除中にボタンを消していたので、続けて押しても2回は送らない
    if (deletingId !== null) return;
    setDeletingId(id);
    try {
      const target = genres.find((genre) => genre.id === id);

      if (!target) {
        throw new Error("deleteWorkspaceTaskGenre couldn't get.");
      }

      const previousGenres = [...genres];
      const shiftedGenres: WorkspaceTaskGenre[] = [];

      const remainingGenres = genres
        .filter((genre) => genre.id !== id)
        .map((genre) => {
          if (genre.sortId > target.sortId) {
            const shifted = { ...genre, sortId: genre.sortId - 1 };
            shiftedGenres.push(shifted);
            return shifted;
          }
          return genre;
        });

      const { error: deleteError } = await clientSupabase
        .from("workspace_task_genre")
        .delete()
        .eq("id", id);

      if (deleteError) {
        throw deleteError;
      }

      for (const genre of shiftedGenres) {
        const { error: updateError } = await clientSupabase
          .from("workspace_task_genre")
          .update({ sort_id: genre.sortId })
          .eq("id", genre.id);

        if (updateError) {
          const rollbackResults = await Promise.allSettled(
            previousGenres.map((previous) =>
              clientSupabase
                .from("workspace_task_genre")
                .update({ sort_id: previous.sortId })
                .eq("id", previous.id)
            )
          );
          const rollbackErrors = rollbackResults.filter((result) => result.status === "rejected");
          if (rollbackErrors.length > 0) {
            console.error("ロールバックの一部に失敗しました", rollbackErrors);
          }
          console.error(`Failed to update sort_id for id=${genre.id}`, updateError);
          throw updateError;
        }
      }

      focusAddAfterDelete.current = true;
      setGenres(remainingGenres);
      if (activeForm?.type === "editGenre" && activeForm.id === id) {
        setActiveForm(null);
      }
      setNotificationValue({
        message: "ジャンルを削除しました。",
        color: 0,
      });
    } catch (error) {
      console.error("Error Delete Task Genre Name", error);
      setNotificationValue({
        message: "ジャンルを削除できませんでした。",
        color: 1,
      });
    }
    setDeletingId(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sortedItems = [...genres].sort((a, b) => a.sortId - b.sortId);
    const oldIndex = sortedItems.findIndex((item) => item.id === Number(active.id));
    const newIndex = sortedItems.findIndex((item) => item.id === Number(over.id));
    const updatedItems = arrayMove(sortedItems, oldIndex, newIndex).map((item, index) => ({
      ...item,
      sortId: index,
    }));

    try {
      setGenres(updatedItems);
      for (const [index, genre] of updatedItems.entries()) {
        const { error: updateError } = await clientSupabase
          .from("workspace_task_genre")
          .update({ sort_id: index + 1 })
          .eq("id", genre.id);

        if (updateError) {
          throw new Error(`Failed to update taskGenre id=${genre.id}`);
        }
      }
    } catch (error) {
      console.error("エラー発生、元のデータに戻します", error);
      setNotificationValue({
        message: "ジャンルを並べ替えられませんでした。",
        color: 1,
      });

      const backupGenres = [...genres];
      setGenres(backupGenres);
      for (const original of backupGenres) {
        const { error: rollbackError } = await clientSupabase
          .from("workspace_task_genre")
          .update({ sort_id: original.sortId })
          .eq("id", original.id);

        if (rollbackError) {
          console.error(`ロールバック失敗: taskGenre id=${original.id}`, rollbackError);
        }
      }
      throw error;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          id={ADD_BUTTON_ID}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setActiveForm({ type: "addGenre" })}
        >
          <Plus aria-hidden />
          ジャンルを追加
        </Button>
      </div>

      {activeForm?.type === "addGenre" && (
        <GenreNameForm
          formLabel="ジャンルの追加"
          initialName=""
          saving={adding}
          onSubmit={handleAdd}
          onCancel={() => closeForm({ type: "addGenre" }, ADD_BUTTON_ID)}
        />
      )}

      {sortedGenres.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          accessibility={{ announcements, screenReaderInstructions }}
        >
          <SortableContext
            items={sortedGenres.map((genre) => String(genre.id))}
            strategy={verticalListSortingStrategy}
          >
            <ul role="list" aria-label="ジャンルの一覧" className="m-0 list-none divide-y rounded-md border p-0">
              {sortedGenres.map((genre) => (
                <GenreRow
                  key={genre.id}
                  genre={genre}
                  isEditing={activeForm?.type === "editGenre" && activeForm.id === genre.id}
                  saving={savingId === genre.id}
                  deleting={deletingId === genre.id}
                  onEdit={() => setActiveForm({ type: "editGenre", id: genre.id })}
                  onCancel={() => closeForm({ type: "editGenre", id: genre.id }, editButtonId(genre.id))}
                  onSave={(name) => handleUpdate(genre.id, name)}
                  onDelete={() => handleDelete(genre.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        activeForm?.type !== "addGenre" && <EmptyState icon={Tags} title="ジャンルはまだありません" />
      )}
    </div>
  );
};

export default TaskGenreSection;
