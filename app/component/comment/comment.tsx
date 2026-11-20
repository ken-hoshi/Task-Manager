import { ChangeEvent, useEffect, useRef, useState } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { fetchCommentData } from "@/app/lib/api/fetchCommentData";
import { clientSupabase } from "@/app/lib/supabase/client";
import { formatDateTime } from "@/app/lib/formatDateTime";
import { postMailNotifications } from "@/app/lib/postMailNotifications";
import { useDisplayWorkspaceIdContext } from "@/app/provider/displayWorkspaceIdProvider";

interface CommentProps {
  userId: number;
  taskId: number;
}

// comments を users(name) と合わせて読んだ1行
interface CommentRow {
  id: number;
  user_id: number;
  comment_text: string;
  created_at: string;
  isDeleted: boolean;
  users: { name: string };
}

// タスクのコメントの一覧と、書く欄。見出しは呼ぶ側が付ける
const Comment: React.FC<CommentProps> = ({ userId, taskId }) => {
  const { setNotificationValue } = useNotificationContext();
  const { displayWorkspaceId } = useDisplayWorkspaceIdContext();
  const [reRendering, setReRendering] = useState<boolean>(false);
  const [commentData, setCommentData] = useState<CommentRow[]>([]);
  const [sendComment, setSendComment] = useState("");
  const [editComment, setEditComment] = useState<string[]>([]);
  const [openEditFormJudgeArray, setOpenEditFormJudgeArray] = useState<
    boolean[]
  >([]);

  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  // メニューで「編集」を選んだとき、メニューを閉じたあとフォーカスをメニューのボタンへ戻さない。
  // 戻すと編集の欄から離れた扱いになり、すぐ保存されてしまう
  const editSelectedRef = useRef(false);

  useEffect(() => {
    (async () => {
      const commentData = await fetchCommentData(taskId);
      if (commentData) {
        setCommentData(commentData);
        setEditComment(commentData.map((comment) => comment.comment_text));
      } else {
        throw new Error("Fetch CommentData couldn't get.");
      }
    })();

    setReRendering(false);
  }, [reRendering]);

  // メニューを開いたら、開いている編集の欄を閉じる（以前と同じ）
  const handleMenuOpenChange = (open: boolean) => {
    if (open) setOpenEditFormJudgeArray(new Array(commentData.length).fill(false));
  };

  const handleOpenEditForm = (clickedNumber: number) => {
    editSelectedRef.current = true;
    setOpenEditFormJudgeArray((prevOpenEditFormJudgeArray) =>
      prevOpenEditFormJudgeArray.map((openEditFormJudgeArray, i) =>
        i === clickedNumber ? !openEditFormJudgeArray : openEditFormJudgeArray
      )
    );

    setTimeout(() => {
      textareaRefs.current[clickedNumber]?.focus();
    }, 0);
  };

  const onChangeEditComment = (
    e: ChangeEvent<HTMLTextAreaElement>,
    index: number
  ) => {
    setEditComment((prev) =>
      prev.map((comment, i) => (i === index ? e.target.value : comment))
    );
  };

  const handleDelete = async (commentId: number) => {
    try {
      const { error: commentDeleteError } = await clientSupabase
        .from("comments")
        .update({ comment_text: "コメントは削除されました。", isDeleted: true })
        .eq("id", commentId);

      if (commentDeleteError) {
        throw commentDeleteError;
      }
    } catch (error) {
      console.error("Delete Comment", error);
      setNotificationValue({
        message: "コメントを削除できませんでした。",
        color: 1,
      });
    }
    setReRendering(true);
  };

  const handleUpdate = async (commentId: number, index: number) => {
    try {
      const { error: commentUpdateError } = await clientSupabase
        .from("comments")
        .update({ comment_text: editComment[index] })
        .eq("id", commentId);

      if (commentUpdateError) {
        throw commentUpdateError;
      }
    } catch (error) {
      console.error("Update Comment", error);
      setNotificationValue({
        message: "コメントを更新できませんでした。",
        color: 1,
      });
    }
    setOpenEditFormJudgeArray(Array(commentData.length).fill(false));
    setReRendering(true);
  };

  const handleSubmit = async (e: React.FormEvent, taskId: number) => {
    e.preventDefault();
    try {
      const { error: commentInsertError } = await clientSupabase
        .from("comments")
        .insert({
          task_id: taskId,
          user_id: userId,
          comment_text: sendComment,
          created_at: new Date().toISOString(),
        });

      if (commentInsertError) {
        throw commentInsertError;
      }

      const postEmailNotificationsError = await postMailNotifications(
        displayWorkspaceId,
        userId,
        taskId,
        null,
        null,
        null,
        3,
        []
      );
      if (postEmailNotificationsError) {
        console.error("Post Mail Notifications", postEmailNotificationsError);
      }
    } catch (error) {
      console.error("Add Comment", error);
      setNotificationValue({
        message: "コメントを追加できませんでした。",
        color: 1,
      });
    }
    setSendComment("");
    setReRendering(true);
  };

  return (
    <div className="space-y-3">
      {commentData.length > 0 ? (
        <ul className="m-0 list-none space-y-3 p-0">
          {commentData.map((comment, index) => {
            const mine = comment.user_id === userId;
            const editing = openEditFormJudgeArray[index];
            return (
              <li
                key={comment.id}
                className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}
              >
                <div className="flex items-baseline gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{comment.users.name}</span>
                  <time dateTime={comment.created_at}>{formatDateTime(comment.created_at)}</time>
                </div>
                <div className={cn("flex max-w-[85%] items-start gap-1", mine && "flex-row-reverse")}>
                  <div
                    className={cn(
                      "min-w-0 rounded-xl px-3 py-2 text-sm whitespace-pre-wrap [overflow-wrap:anywhere]",
                      comment.isDeleted
                        ? "bg-muted/50 text-muted-foreground"
                        : mine
                          ? "bg-primary/10"
                          : "bg-muted",
                      editing && "w-80 max-w-full p-1"
                    )}
                  >
                    {editing ? (
                      <Textarea
                        aria-label="コメントを編集"
                        value={editComment[index]}
                        required
                        onChange={(e) => onChangeEditComment(e, index)}
                        onBlur={() => handleUpdate(comment.id, index)}
                        ref={(el) => {
                          textareaRefs.current[index] = el;
                        }}
                        className="bg-background"
                      />
                    ) : (
                      comment.comment_text
                    )}
                  </div>
                  {mine && !comment.isDeleted && (
                    <DropdownMenu onOpenChange={handleMenuOpenChange}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs" aria-label="コメントの操作">
                          <MoreVertical className="size-3.5" aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        onCloseAutoFocus={(e) => {
                          if (editSelectedRef.current) {
                            e.preventDefault();
                            editSelectedRef.current = false;
                          }
                        }}
                      >
                        <DropdownMenuItem onSelect={() => handleOpenEditForm(index)}>
                          <Pencil aria-hidden />
                          編集
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onSelect={() => handleDelete(comment.id)}>
                          <Trash2 aria-hidden />
                          削除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="m-0 text-sm text-muted-foreground">コメントはありません</p>
      )}

      <form onSubmit={(e) => handleSubmit(e, taskId)} className="flex items-end gap-2">
        <Textarea
          aria-label="コメント"
          placeholder="コメントを書く"
          value={sendComment}
          onChange={(e) => setSendComment(e.target.value)}
          required
          className="max-h-40"
        />
        <Button type="submit">送る</Button>
      </form>
    </div>
  );
};

export default Comment;
