import classNames from "classnames";
import styles from "./comment.module.css";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { fetchCommentData } from "@/app/lib/fetchCommentData";
import { clientSupabase } from "@/app/lib/supabase/client";
import { formatDateTime } from "@/app/lib/formatDateTime";
import { postMailNotifications } from "@/app/lib/postMailNotifications";

interface CommentProps {
  userId: number;
  taskId: number;
  projectDetail?: boolean;
}

const Comment: React.FC<CommentProps> = ({ userId, taskId, projectDetail }) => {
  const { setNotificationValue } = useNotificationContext();

  const [reRendering, setReRendering] = useState<boolean>(false);
  const [commentData, setCommentData] = useState<{}[]>([]);
  const [sendComment, setSendComment] = useState("");
  const [editComment, setEditComment] = useState<string[]>([]);
  const [showOptions, setShowOptions] = useState<null | number>(null);
  const [openEditFormJudgeArray, setOpenEditFormJudgeArray] = useState<
    boolean[]
  >([]);

  const menuRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);

    const getCommentData = async () => {
      const commentData = await fetchCommentData(taskId);
      if (commentData) {
        setCommentData(commentData);
        setEditComment(commentData.map((comment) => comment.comment_text));
      } else {
        throw new Error("Fetch CommentData is null.");
      }
    };
    getCommentData();

    setReRendering(false);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [reRendering]);

  const handleOptionClick = (commentId: number) => {
    setOpenEditFormJudgeArray(new Array(commentData.length).fill(false));
    setShowOptions(showOptions === commentId ? null : commentId);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setShowOptions(null);
    }
  };

  const handleOpenEditForm = (clickedNumber: number) => {
    setOpenEditFormJudgeArray((prevOpenEditFormJudgeArray) =>
      prevOpenEditFormJudgeArray.map((openEditFormJudgeArray, i) =>
        i === clickedNumber ? !openEditFormJudgeArray : openEditFormJudgeArray
      )
    );
    setShowOptions(null);

    setTimeout(() => {
      inputRefs.current[clickedNumber]?.focus();
    }, 0);
  };

  const onChangeEditComment = (
    e: ChangeEvent<HTMLInputElement>,
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
      console.error("Error delete comment:", error);
      setNotificationValue({
        message: "Comment was not deleted.",
        color: 1,
      });
    }
    setShowOptions(null);
    setReRendering(true);
  };

  const handleUpdate = async (commentId: number, index: number) => {
    try {
      const { error: commentUpdateError } = await clientSupabase
        .from("comments")
        .update({ comment_text: editComment[index], created_at: new Date() })
        .eq("id", commentId);

      if (commentUpdateError) {
        throw commentUpdateError;
      }
    } catch (error) {
      console.error("Error edit comment:", error);
      setNotificationValue({
        message: "Comment was not edited.",
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
        userId,
        taskId,
        null,
        3
      );
      if (postEmailNotificationsError) {
        console.error(
          "Error post mail notifications:",
          postEmailNotificationsError
        );
      }
    } catch (error) {
      console.error("Error insert comment:", error);
      setNotificationValue({
        message: "Comment was not added.",
        color: 1,
      });
    }
    setSendComment("");
    setReRendering(true);
  };

  return (
    <div className={styles[`comment-area`]}>
      <dt>Comments</dt>
      <dd className={classNames(styles[`dd-comment`], styles[`dd-last`])}>
        <div
          className={
            projectDetail
              ? styles[`project-detail-comment-section`]
              : styles[`comment-section`]
          }
        >
          {Array.isArray(commentData) && commentData.length > 0 ? (
            commentData?.map((comment: any, index) => (
              <div
                className={
                  comment.user_id === userId
                    ? styles[`comment-myself`]
                    : styles[`comment-others`]
                }
                key={comment.id}
              >
                {showOptions === comment.id && comment.user_id == userId && (
                  <div className={styles[`options-menu-container`]}>
                    <div
                      className={classNames(
                        styles[`options-menu`],
                        styles[`user-menu`]
                      )}
                      ref={menuRef}
                    >
                      <p
                        className={styles.edit}
                        onClick={() => handleOpenEditForm(index)}
                      >
                        Edit
                      </p>
                      <p
                        className={styles.delete}
                        onClick={() => handleDelete(comment.id)}
                      >
                        Delete
                      </p>
                    </div>
                  </div>
                )}
                <div
                  className={classNames(
                    comment.user_id !== userId && styles.none,
                    projectDetail
                      ? styles[`project-detail-comment-bubble`]
                      : styles[`comment-bubble`],
                    comment.isDeleted
                      ? styles[`deleted-color`]
                      : styles[`normal-color`]
                  )}
                >
                  {!comment.isDeleted && (
                    <div className={styles[`vert-container`]}>
                      <span
                        className={classNames(
                          "material-symbols-outlined",
                          projectDetail
                            ? styles[`project-detail-vert`]
                            : styles.vert
                        )}
                        onClick={() => handleOptionClick(comment.id)}
                      >
                        more_vert
                      </span>
                    </div>
                  )}
                  {openEditFormJudgeArray[index] ? (
                    <form>
                      <input
                        type="text"
                        value={editComment[index]}
                        onChange={(e) => onChangeEditComment(e, index)}
                        onBlur={() => handleUpdate(comment.id, index)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleUpdate(comment.id, index);
                          }
                        }}
                        ref={(el) => (inputRefs.current[index] = el)}
                        className={
                          projectDetail
                            ? styles[`project-detail-bubble-input`]
                            : styles[`bubble-input`]
                        }
                      />
                    </form>
                  ) : (
                    <div
                      className={
                        projectDetail
                          ? styles[`project-detail-comment-text`]
                          : styles[`comment-text`]
                      }
                    >
                      {comment.comment_text}
                    </div>
                  )}
                </div>

                <div className={styles[`comment-header`]}>
                  <div className={styles[`comment-author`]}>
                    {comment.users.name}
                  </div>

                  <div
                    className={
                      projectDetail
                        ? styles[`project-detail-comment-date`]
                        : styles[`comment-date`]
                    }
                  >
                    {formatDateTime(comment.created_at)}
                  </div>
                </div>

                <div
                  className={classNames(
                    comment.user_id == userId && styles.none,
                    projectDetail
                      ? styles[`project-detail-comment-bubble`]
                      : styles[`comment-bubble`],
                    comment.isDeleted
                      ? styles[`deleted-color`]
                      : styles[`normal-color`]
                  )}
                >
                  <div
                    className={
                      projectDetail
                        ? styles[`project-detail-comment-text`]
                        : styles[`comment-text`]
                    }
                  >
                    {comment.comment_text}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p>No Comment</p>
          )}
        </div>
        <div className={styles[`comment-form-area`]}>
          <form onSubmit={(e) => handleSubmit(e, taskId)}>
            <input
              type="text"
              placeholder="Enter your comment"
              value={sendComment}
              onChange={(e) => setSendComment(e.target.value)}
              required
              className={
                projectDetail ? styles[`project-detail-input`] : styles.input
              }
            />
            <button
              type="submit"
              className={
                projectDetail ? styles[`project-detail-button`] : styles.button
              }
            >
              Comment
            </button>
          </form>
        </div>
      </dd>
    </div>
  );
};

export default Comment;
