import classNames from "classnames";
import styles from "./comment.module.css";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { fetchCommentData } from "@/app/lib/api/fetchCommentData";
import { clientSupabase } from "@/app/lib/supabase/client";
import { formatDateTime } from "@/app/lib/formatDateTime";
import { postMailNotifications } from "@/app/lib/postMailNotifications";
import { useDisplayWorkspaceIdContext } from "@/app/provider/displayWorkspaceIdProvider";

interface CommentProps {
  userId: number;
  taskId: number;
  projectDetails?: boolean;
}

const Comment: React.FC<CommentProps> = ({
  userId,
  taskId,
  projectDetails,
}) => {
  const { setNotificationValue } = useNotificationContext();
  const { displayWorkspaceId } = useDisplayWorkspaceIdContext();
  const [reRendering, setReRendering] = useState<boolean>(false);
  const [commentData, setCommentData] = useState<{}[]>([]);
  const [sendComment, setSendComment] = useState("");
  const [editComment, setEditComment] = useState<string[]>([]);
  const [showOptions, setShowOptions] = useState<null | number>(null);
  const [openEditFormJudgeArray, setOpenEditFormJudgeArray] = useState<
    boolean[]
  >([]);

  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);

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
        message: "Couldn't delete Comment.",
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
        .update({ comment_text: editComment[index] })
        .eq("id", commentId);

      if (commentUpdateError) {
        throw commentUpdateError;
      }
    } catch (error) {
      console.error("Update Comment", error);
      setNotificationValue({
        message: "Couldn't update Comment.",
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
        message: "Couldn't add Comment.",
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
            projectDetails
              ? styles[`project-details-comment-section`]
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
                      <div
                        className={styles[`edit-text-container`]}
                        onClick={() => handleOpenEditForm(index)}
                      >
                        <p>Edit</p>
                      </div>
                      <div
                        className={styles[`delete-text-container`]}
                        onClick={() => handleDelete(comment.id)}
                      >
                        <p>Delete</p>
                      </div>
                    </div>
                  </div>
                )}
                <div
                  className={classNames(
                    comment.user_id !== userId && styles.none,
                    projectDetails
                      ? styles[`project-details-comment-bubble`]
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
                          projectDetails
                            ? styles[`project-details-vert`]
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
                      <textarea
                        value={editComment[index]}
                        required
                        onChange={(e) => onChangeEditComment(e, index)}
                        onBlur={() => handleUpdate(comment.id, index)}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = "auto";
                          target.style.height = `${target.scrollHeight}px`;
                        }}
                        ref={(el) => (textareaRefs.current[index] = el)}
                        className={
                          projectDetails
                            ? styles[`project-details-bubble-textarea`]
                            : styles[`bubble-textarea`]
                        }
                      />
                    </form>
                  ) : (
                    <div
                      className={
                        projectDetails
                          ? styles[`project-details-comment-text`]
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
                      projectDetails
                        ? styles[`project-details-comment-date`]
                        : styles[`comment-date`]
                    }
                  >
                    {formatDateTime(comment.created_at)}
                  </div>
                </div>

                <div
                  className={classNames(
                    comment.user_id == userId && styles.none,
                    projectDetails
                      ? styles[`project-details-comment-bubble`]
                      : styles[`comment-bubble`],
                    comment.isDeleted
                      ? styles[`deleted-color`]
                      : styles[`normal-color`]
                  )}
                >
                  <div
                    className={
                      projectDetails
                        ? styles[`project-details-comment-text`]
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
            <textarea
              placeholder="Enter your comment"
              value={sendComment}
              onChange={(e) => setSendComment(e.target.value)}
              required
              className={
                projectDetails
                  ? styles[`project-details-textarea`]
                  : styles[`task-textarea`]
              }
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${target.scrollHeight}px`;
              }}
            />
            <div className={styles[`button-container`]}>
              <button
                type="submit"
                className={
                  projectDetails
                    ? styles[`project-details-button`]
                    : styles[`task-button`]
                }
              >
                Comment
              </button>
            </div>
          </form>
        </div>
      </dd>
    </div>
  );
};

export default Comment;
