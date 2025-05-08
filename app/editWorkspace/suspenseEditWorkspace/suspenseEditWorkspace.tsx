"use client";

import BackgroundImage2 from "@/app/component/backgroundImage2/backgroundImage2";
import Loading from "@/app/component/loading/loading";
import styles from "./suspenseEditWorkspace.module.css";
import { useRouter, useSearchParams } from "next/navigation";
import { SetStateAction, useEffect, useState } from "react";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import NotificationBanner from "@/app/component/notificationBanner/notificationBanner";
import { clientSupabase } from "@/app/lib/supabase/client";
import classNames from "classnames";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getSession } from "@/app/hooks/getSession";
import { useFormContext } from "@/app/provider/formProvider";
import { Logout } from "@/app/hooks/logout";
import { useSessionTimeout } from "@/app/hooks/sessionTimeout";

interface WorkspaceProps {
  id: number;
  name: string;
  spaceId: string;
}

interface WorkspaceUsersProps {
  id: number;
  name: string;
}

interface WorkspaceTaskGenreProps {
  id: number;
  taskGenreName: string;
  sortId: number;
}

enum Switch {
  taskGenre,
  member,
}

interface OpenTaskGenreNameFormProps {
  taskGenreId: number;
  taskGenreName: string;
  formOpen: boolean;
}

const SuspenseEditWorkspace: React.FC = () => {
  const { notificationValue, setNotificationValue } = useNotificationContext();
  const { setBackForm } = useFormContext();
  const { useLogout } = Logout();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramsWorkspaceId = Number(searchParams.get("workspaceId"));
  const paramsUserId = Number(searchParams.get("userId"));
  const sensors = useSensors(useSensor(PointerSensor));

  const [loading, setLoading] = useState(true);
  const [postWorkspaceNameLoading, setPostWorkspaceNameLoading] =
    useState(false);
  const [displayWorkspaceId, setDisplayWorkspaceId] = useState(0);
  const [userId, setUserId] = useState(0);
  const [workspaceData, setWorkspaceData] = useState<WorkspaceProps>({
    id: 0,
    name: "",
    spaceId: "",
  });
  const [workspaceUsersArray, setWorkspaceUsersArray] = useState<
    WorkspaceUsersProps[]
  >([]);
  const [workspaceTaskGenreArray, setWorkspaceTaskGenreArray] = useState<
    WorkspaceTaskGenreProps[]
  >([]);
  const [openWorkspaceNameEditForm, setOpenWorkspaceNameEditForm] =
    useState(false);
  const [editWorkspaceName, setEditWorkspaceName] = useState("");
  const [copied, setCopied] = useState(false);
  const [tabJudgeList, setTabJudgeList] = useState({
    taskGenre: true,
    member: false,
  });
  const [
    openTaskGenreNameEditFormDataArray,
    setOpenTaskGenreNameEditFormDataArray,
  ] = useState<OpenTaskGenreNameFormProps[]>([]);

  const [openTaskGenreNameAddForm, setOpenTaskGenreNameAddForm] =
    useState(false);
  const [addTaskGenreName, setAddTaskGenreName] = useState("");
  const [postTaskGenreNameLoading, setPostTaskGenreNameLoading] =
    useState(false);
  const [openDeleteUserModal, setOpenDeleteUserModal] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState(0);

  useEffect(() => {
    const fetchWorkspaceData = async () => {
      const session = await getSession();
      if (!paramsWorkspaceId || !paramsUserId || !session?.user.id) {
        console.error("Fetch Data: User ID couldn't get.");
        setBackForm(true);
        alert("データの取得に失敗しました。");
        router.push("/");
        return;
      }
      setDisplayWorkspaceId(paramsWorkspaceId);
      setUserId(paramsUserId);

      try {
        const { data: workspaceData, error: selectWorkspaceDataError } =
          await clientSupabase
            .from("workspace")
            .select(
              "id, workspace_name, space_id, workspace_task_genre(id, task_genre_name, sort_id), workspace_users(users(id, name))"
            )
            .eq("id", paramsWorkspaceId)
            .single();

        if (selectWorkspaceDataError) {
          throw selectWorkspaceDataError;
        }

        if (!workspaceData) {
          throw new Error("Workspace Data couldn't get.");
        }

        setWorkspaceData({
          id: workspaceData.id,
          name: workspaceData.workspace_name,
          spaceId: workspaceData.space_id,
        });

        setWorkspaceUsersArray(
          workspaceData.workspace_users.map((user: any) => ({
            id: user.users.id,
            name: user.users.name,
          }))
        );

        setWorkspaceTaskGenreArray(
          workspaceData.workspace_task_genre
            .map((taskGenre: any) => ({
              id: taskGenre.id,
              taskGenreName: taskGenre.task_genre_name,
              sortId: taskGenre.sort_id,
            }))
            .sort(
              (a: { sortId: number }, b: { sortId: number }) =>
                a.sortId - b.sortId
            )
        );
        setEditWorkspaceName(workspaceData.workspace_name);
        setOpenTaskGenreNameEditFormDataArray(
          workspaceData.workspace_task_genre.map((taskGenre: any) => ({
            taskGenreId: taskGenre.id,
            taskGenreName: taskGenre.task_genre_name,
            formOpen: false,
          }))
        );
      } catch (error) {
        console.error("Fetch Workspace Data", error);
        router.push("/task");
        setNotificationValue({
          message: "Couldn't get the Workspace Data.",
          color: 1,
        });
      }
      setLoading(false);
    };
    fetchWorkspaceData();
  }, []);

  const handlePageBack = () => {
    router.push("/task");
  };

  const handleOpenWorkspaceNameForm = () => {
    setOpenWorkspaceNameEditForm(true);
    setOpenTaskGenreNameEditFormDataArray(
      (prevOpenTaskGenreNameEditFormDataArray) =>
        prevOpenTaskGenreNameEditFormDataArray.map(
          (openTaskGenreNameFormData) => ({
            ...openTaskGenreNameFormData,
            formOpen: false,
          })
        )
    );
    setOpenTaskGenreNameAddForm(false);
    setAddTaskGenreName("");
  };

  const handleCloseWorkspaceNameForm = () => {
    setOpenWorkspaceNameEditForm(false);
    setEditWorkspaceName(workspaceData.name);
  };

  const handleWorkspaceNameSubmit = async (e: {
    preventDefault: () => void;
  }) => {
    e.preventDefault();

    setPostWorkspaceNameLoading(true);
    try {
      const { error: workspaceNameUpdateError } = await clientSupabase
        .from("workspace")
        .update({ workspace_name: editWorkspaceName })
        .eq("id", displayWorkspaceId);

      if (workspaceNameUpdateError) {
        throw workspaceNameUpdateError;
      }

      setWorkspaceData((prev) => ({
        ...prev,
        name: editWorkspaceName,
      }));
      setEditWorkspaceName(editWorkspaceName);
      setNotificationValue({
        message: "Workspace Name was updated !",
        color: 0,
      });
    } catch (error) {
      console.error("Error Update Workspace Name", error);
      setNotificationValue({
        message: "Couldn't update Workspace Name.",
        color: 1,
      });
    }
    setPostWorkspaceNameLoading(false);
    setOpenWorkspaceNameEditForm(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(workspaceData.spaceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTabSwitch = (target: Switch) => {
    setOpenWorkspaceNameEditForm(false);
    setEditWorkspaceName(workspaceData.name);
    setOpenTaskGenreNameAddForm(false);
    setAddTaskGenreName("");
    setOpenTaskGenreNameEditFormDataArray(
      (prevOpenTaskGenreNameEditFormDataArray) =>
        prevOpenTaskGenreNameEditFormDataArray.map(
          (openTaskGenreNameEditFormDataArray) => ({
            ...openTaskGenreNameEditFormDataArray,
            formOpen: false,
          })
        )
    );
    switch (target) {
      case Switch.taskGenre:
        setTabJudgeList({
          taskGenre: true,
          member: false,
        });
        break;
      case Switch.member:
        setTabJudgeList({
          taskGenre: false,
          member: true,
        });
        break;

      default:
        setTabJudgeList({
          taskGenre: true,
          member: false,
        });
        break;
    }
  };

  const handleOpenTaskGenreNameAddForm = () => {
    setOpenTaskGenreNameEditFormDataArray(
      (prevOpenTaskGenreNameEditFormDataArray) =>
        prevOpenTaskGenreNameEditFormDataArray.map(
          (openTaskGenreNameEditFormDataArray) => ({
            ...openTaskGenreNameEditFormDataArray,
            formOpen: false,
          })
        )
    );
    setOpenTaskGenreNameAddForm(true);
    setOpenWorkspaceNameEditForm(false);
    setEditWorkspaceName(workspaceData.name);
  };

  const handleCloseTaskGenreNameAddForm = () => {
    setOpenTaskGenreNameAddForm(false);
    setAddTaskGenreName("");
  };

  const handleSubmitAddTaskGenreName = async (e: {
    preventDefault: () => void;
  }) => {
    e.preventDefault();

    setPostTaskGenreNameLoading(true);
    try {
      const lastSortId =
        workspaceTaskGenreArray.length > 0
          ? workspaceTaskGenreArray[workspaceTaskGenreArray.length - 1].sortId
          : 0;

      const {
        data: workspaceTaskGenreInsertData,
        error: workspaceTaskGenreInsertError,
      } = await clientSupabase
        .from("workspace_task_genre")
        .insert({
          task_genre_name: addTaskGenreName,
          workspace_id: workspaceData.id,
          sort_id: lastSortId + 1,
        })
        .select()
        .single();

      if (workspaceTaskGenreInsertError) {
        throw workspaceTaskGenreInsertError;
      }

      if (workspaceTaskGenreInsertData) {
        setWorkspaceTaskGenreArray((prev) => [
          ...prev,
          {
            id: workspaceTaskGenreInsertData.id,
            taskGenreName: workspaceTaskGenreInsertData.task_genre_name,
            sortId: workspaceTaskGenreInsertData.sort_id,
          },
        ]);
        setOpenTaskGenreNameEditFormDataArray(
          (prevOpenTaskGenreNameEditFormDataArray) => [
            ...prevOpenTaskGenreNameEditFormDataArray,
            {
              taskGenreId: workspaceTaskGenreInsertData.id,
              taskGenreName: workspaceTaskGenreInsertData.task_genre_name,
              formOpen: false,
            },
          ]
        );
      } else {
        throw new Error("workspaceTaskGenreInsertData couldn't get.");
      }
      setNotificationValue({
        message: "Task Genre Name was updated !",
        color: 0,
      });
    } catch (error) {
      console.error("Error Update Task Genre Name", error);
      setNotificationValue({
        message: "Couldn't add Task Genre Name.",
        color: 1,
      });
    }
    setAddTaskGenreName("");
    setPostTaskGenreNameLoading(false);
    setOpenTaskGenreNameAddForm(false);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const sortedItems = [...workspaceTaskGenreArray].sort(
        (a, b) => a.sortId - b.sortId
      );
      const oldIndex = sortedItems.findIndex(
        (item) => item.id === Number(active.id)
      );
      const newIndex = sortedItems.findIndex(
        (item) => item.id === Number(over.id)
      );
      const newItems = arrayMove(sortedItems, oldIndex, newIndex);
      const updatedItems = newItems.map((item, index) => ({
        ...item,
        sortId: index,
      }));

      try {
        setWorkspaceTaskGenreArray(updatedItems);
        for (const [index, taskGenreItems] of updatedItems.entries()) {
          const { error: updateWorkspaceTaskGenreError } = await clientSupabase
            .from("workspace_task_genre")
            .update({ sort_id: index + 1 })
            .eq("id", taskGenreItems.id);

          if (updateWorkspaceTaskGenreError) {
            throw new Error(
              `Failed to update taskGenre id=${taskGenreItems.id}`
            );
          }
        }
      } catch (error) {
        console.error("エラー発生、元のデータに戻します", error);
        setNotificationValue({
          message: "Couldn't sort Task Genre.",
          color: 1,
        });

        const backupWorkspaceTaskGenreData = [...workspaceTaskGenreArray];
        setWorkspaceTaskGenreArray(backupWorkspaceTaskGenreData);
        for (const original of backupWorkspaceTaskGenreData) {
          const { error: rollbackError } = await clientSupabase
            .from("workspace_task_genre")
            .update({ sort_id: original.sortId })
            .eq("id", original.id);

          if (rollbackError) {
            console.error(
              `ロールバック失敗: taskGenre id=${original.id}`,
              rollbackError
            );
          }
        }
        throw error;
      }
    }
  };
  const sortedItems = [...workspaceTaskGenreArray].sort(
    (a, b) => a.sortId - b.sortId
  );

  const handleOpenDeleteUserModal = (userId: number) => {
    setOpenDeleteUserModal(true);
    setOpenWorkspaceNameEditForm(false);
    setEditWorkspaceName(workspaceData.name);
    setDeleteUserId(userId);
  };

  const handleSubmitDeleteUser = async () => {
    try {
      const { error: deleteWorkspaceUserError } = await clientSupabase
        .from("workspace_users")
        .delete()
        .eq("workspace_id", workspaceData.id)
        .eq("user_id", deleteUserId);

      if (deleteWorkspaceUserError) {
        throw deleteWorkspaceUserError;
      }
      setWorkspaceUsersArray(
        workspaceUsersArray.filter((user) => user.id !== deleteUserId)
      );
      setOpenDeleteUserModal(false);
      setNotificationValue({
        message: "User was deleted.",
        color: 0,
      });
      if (deleteUserId === userId) {
        await useLogout();
      }
    } catch (error) {
      console.error("Error Delete User", error);
      setNotificationValue({
        message: "Couldn't delete User.",
        color: 1,
      });
    }
  };

  useSessionTimeout();

  return (
    <>
      {loading ? (
        <Loading />
      ) : (
        <>
          {notificationValue.message && (
            <NotificationBanner
              message={notificationValue.message}
              color={notificationValue.color}
            />
          )}

          <div>
            <BackgroundImage2 />

            <div className={styles[`inner-area`]}>
              <div className={styles[`select-edit-workspace-area-container`]}>
                <div className={styles[`select-edit-workspace-area`]}>
                  <span
                    className={classNames(
                      "material-symbols-outlined",
                      styles.back
                    )}
                    onClick={handlePageBack}
                  >
                    arrow_back
                  </span>
                  <h1>
                    ワークスペース
                    <br />
                    を編集する
                  </h1>
                  <div className={styles[`form-group-container`]}>
                    <div className={styles[`form-group`]}>
                      <p>Name</p>
                      {openWorkspaceNameEditForm ? (
                        <div className={styles[`workspace-name-form-area`]}>
                          <form onSubmit={handleWorkspaceNameSubmit}>
                            <input
                              type="text"
                              value={editWorkspaceName}
                              onChange={(e) =>
                                setEditWorkspaceName(e.target.value)
                              }
                              placeholder="Workspace Name"
                              required
                              className={styles[`workspace-name-form`]}
                            />
                            <div
                              className={styles[`workspace-name-button-area`]}
                            >
                              <button
                                className={styles[`cancel-button`]}
                                type="button"
                                onClick={handleCloseWorkspaceNameForm}
                              >
                                <span
                                  className={classNames(
                                    "material-symbols-outlined",
                                    styles.cancel
                                  )}
                                >
                                  close_small
                                </span>
                              </button>

                              <button
                                className={styles[`update-button`]}
                                type="submit"
                              >
                                {postWorkspaceNameLoading ? (
                                  <div
                                    className={styles[`update-button-spinner`]}
                                  ></div>
                                ) : (
                                  <span
                                    className={classNames(
                                      "material-symbols-outlined",
                                      styles.check
                                    )}
                                  >
                                    check_small
                                  </span>
                                )}
                              </button>
                            </div>
                          </form>
                        </div>
                      ) : (
                        <div className={styles[`selected-workspace-name-area`]}>
                          <div className={styles[`selected-workspace-name`]}>
                            {workspaceData.name}
                          </div>
                          <span
                            className={classNames(
                              "material-symbols-outlined",
                              styles.edit
                            )}
                            onClick={handleOpenWorkspaceNameForm}
                          >
                            {" "}
                            edit{" "}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={styles[`form-group-container`]}>
                    <div className={styles[`form-group`]}>
                      <p>Space ID</p>
                      <div
                        className={styles[`selected-workspace-space-id-area`]}
                      >
                        {workspaceData.spaceId}

                        <span
                          className={classNames(
                            "material-symbols-outlined",
                            styles.copy
                          )}
                          onClick={handleCopy}
                        >
                          {" "}
                          content_copy{" "}
                        </span>
                      </div>
                      {copied && (
                        <div className={styles[`copied-message`]}>Copied！</div>
                      )}
                    </div>
                  </div>

                  <div className={styles[`task-genre-member-area`]}>
                    <div className={styles[`tab-area-container`]}>
                      <div className={styles[`tab-area`]}>
                        <div className={styles.tab}>
                          <button
                            className={classNames(
                              styles[`tab-button`],
                              tabJudgeList.taskGenre && styles.active
                            )}
                            onClick={() => handleTabSwitch(Switch.taskGenre)}
                          >
                            Task Genre
                          </button>
                          <button
                            className={classNames(
                              styles[`tab-button`],
                              tabJudgeList.member && styles.active
                            )}
                            onClick={() => handleTabSwitch(Switch.member)}
                          >
                            Member
                          </button>
                        </div>
                        {!tabJudgeList.member && tabJudgeList.taskGenre && (
                          <span
                            className={classNames(
                              "material-symbols-outlined",
                              styles.plus
                            )}
                            onClick={handleOpenTaskGenreNameAddForm}
                          >
                            {" "}
                            add{" "}
                          </span>
                        )}
                      </div>
                    </div>

                    {!tabJudgeList.member && tabJudgeList.taskGenre ? (
                      <>
                        {workspaceTaskGenreArray.length > 0 ? (
                          <div className={styles[`table-area`]}>
                            {openTaskGenreNameAddForm && (
                              <div
                                className={
                                  styles[`task-genre-name-add-form-area`]
                                }
                              >
                                <form onSubmit={handleSubmitAddTaskGenreName}>
                                  <input
                                    type="text"
                                    value={addTaskGenreName}
                                    onChange={(e) =>
                                      setAddTaskGenreName(e.target.value)
                                    }
                                    placeholder="Task Genre Name"
                                    required
                                    className={styles[`task-genre-name-form`]}
                                  />
                                  <div
                                    className={
                                      styles[`task-genre-name-button-area`]
                                    }
                                  >
                                    <button
                                      className={styles[`cancel-button`]}
                                      type="button"
                                      onClick={handleCloseTaskGenreNameAddForm}
                                    >
                                      <span
                                        className={classNames(
                                          "material-symbols-outlined",
                                          styles.cancel
                                        )}
                                      >
                                        close_small
                                      </span>
                                    </button>

                                    <button
                                      className={styles[`update-button`]}
                                      type="submit"
                                    >
                                      {postTaskGenreNameLoading ? (
                                        <div
                                          className={
                                            styles[`update-button-spinner`]
                                          }
                                        ></div>
                                      ) : (
                                        <span
                                          className={classNames(
                                            "material-symbols-outlined",
                                            styles.check
                                          )}
                                        >
                                          check_small
                                        </span>
                                      )}
                                    </button>
                                  </div>
                                </form>
                              </div>
                            )}
                            <div
                              className={styles[`task-genre-area-container`]}
                            >
                              <div className={styles[`task-genre-area`]}>
                                <DndContext
                                  sensors={sensors}
                                  collisionDetection={closestCenter}
                                  onDragEnd={handleDragEnd}
                                >
                                  <SortableContext
                                    items={sortedItems.map((item) =>
                                      String(item.id)
                                    )}
                                    strategy={verticalListSortingStrategy}
                                  >
                                    {sortedItems.map((item) => (
                                      <SortableItem
                                        key={item.id}
                                        id={String(item.id)}
                                        workspaceData={workspaceData}
                                        setOpenWorkspaceNameEditForm={
                                          setOpenWorkspaceNameEditForm
                                        }
                                        setEditWorkspaceName={
                                          setEditWorkspaceName
                                        }
                                        workspaceTaskGenreArray={
                                          workspaceTaskGenreArray
                                        }
                                        setWorkspaceTaskGenreArray={
                                          setWorkspaceTaskGenreArray
                                        }
                                        openTaskGenreNameEditFormDataArray={
                                          openTaskGenreNameEditFormDataArray
                                        }
                                        setOpenTaskGenreNameEditFormDataArray={
                                          setOpenTaskGenreNameEditFormDataArray
                                        }
                                        setOpenTaskGenreNameAddForm={
                                          setOpenTaskGenreNameAddForm
                                        }
                                        setAddTaskGenreName={
                                          setAddTaskGenreName
                                        }
                                      />
                                    ))}
                                  </SortableContext>
                                </DndContext>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            {openTaskGenreNameAddForm ? (
                              <div
                                className={
                                  styles[`task-genre-name-add-form-area`]
                                }
                              >
                                <form onSubmit={handleSubmitAddTaskGenreName}>
                                  <input
                                    type="text"
                                    value={addTaskGenreName}
                                    onChange={(e) =>
                                      setAddTaskGenreName(e.target.value)
                                    }
                                    placeholder="Task Genre Name"
                                    required
                                    className={styles[`task-genre-name-form`]}
                                  />
                                  <div
                                    className={
                                      styles[`task-genre-name-button-area`]
                                    }
                                  >
                                    <button
                                      className={styles[`cancel-button`]}
                                      type="button"
                                      onClick={handleCloseTaskGenreNameAddForm}
                                    >
                                      <span
                                        className={classNames(
                                          "material-symbols-outlined",
                                          styles.cancel
                                        )}
                                      >
                                        close_small
                                      </span>
                                    </button>

                                    <button
                                      className={styles[`update-button`]}
                                      type="submit"
                                    >
                                      {postTaskGenreNameLoading ? (
                                        <div
                                          className={
                                            styles[`update-button-spinner`]
                                          }
                                        ></div>
                                      ) : (
                                        <span
                                          className={classNames(
                                            "material-symbols-outlined",
                                            styles.check
                                          )}
                                        >
                                          check_small
                                        </span>
                                      )}
                                    </button>
                                  </div>
                                </form>
                              </div>
                            ) : (
                              <div
                                className={styles[`non-task-genres-container`]}
                              >
                                <div className={styles[`non-task-genres`]}>
                                  No Task Genre
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      <div
                        className={styles[`workspace-member-area-container`]}
                      >
                        <div className={styles[`workspace-member-area`]}>
                          {workspaceUsersArray.map((workspaceUser) => (
                            <div
                              className={styles[`workspace-member-container`]}
                              key={workspaceUser.id}
                            >
                              <div className={styles[`workspace-member-name`]}>
                                {workspaceUser.name}
                              </div>
                              <span
                                className={classNames(
                                  "material-symbols-outlined",
                                  styles.delete
                                )}
                                onClick={() =>
                                  handleOpenDeleteUserModal(workspaceUser.id)
                                }
                              >
                                {" "}
                                delete{" "}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className={styles[`workspace-join-and-create-area`]}>
                      <div
                        className={styles[`create-workspace`]}
                        onClick={() =>
                          router.push(
                            `/createWorkspace?atSignUp=false&workspaceId=${displayWorkspaceId}`
                          )
                        }
                      >
                        ワークスペースを作成する
                      </div>
                      <div
                        className={styles[`join-workspace`]}
                        onClick={() =>
                          router.push(
                            `/joinWorkspace?atSignUp=false&workspaceId=${displayWorkspaceId}`
                          )
                        }
                      >
                        他のワークスペースに参加する
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {openDeleteUserModal && (
              <div className={styles[`modal-backdrop`]}>
                <div className={styles[`modal-content`]}>
                  <p>delete it OK?</p>
                  <button
                    className={styles[`modal-cancel-button`]}
                    onClick={() => setOpenDeleteUserModal(false)}
                  >
                    No
                  </button>
                  <button
                    className={styles[`modal-yes-button`]}
                    onClick={handleSubmitDeleteUser}
                  >
                    Yes
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};

function SortableItem({
  id,
  workspaceData,
  setOpenWorkspaceNameEditForm,
  setEditWorkspaceName,
  workspaceTaskGenreArray,
  setWorkspaceTaskGenreArray,
  openTaskGenreNameEditFormDataArray,
  setOpenTaskGenreNameEditFormDataArray,
  setOpenTaskGenreNameAddForm,
  setAddTaskGenreName,
}: {
  id: string;
  workspaceData: WorkspaceProps;
  workspaceTaskGenreArray: WorkspaceTaskGenreProps[];
  setOpenWorkspaceNameEditForm: React.Dispatch<SetStateAction<boolean>>;
  setEditWorkspaceName: React.Dispatch<SetStateAction<string>>;
  setWorkspaceTaskGenreArray: React.Dispatch<
    SetStateAction<WorkspaceTaskGenreProps[]>
  >;
  openTaskGenreNameEditFormDataArray: OpenTaskGenreNameFormProps[];
  setOpenTaskGenreNameEditFormDataArray: React.Dispatch<
    SetStateAction<OpenTaskGenreNameFormProps[]>
  >;
  setOpenTaskGenreNameAddForm: React.Dispatch<SetStateAction<boolean>>;
  setAddTaskGenreName: React.Dispatch<SetStateAction<string>>;
}) {
  const { setNotificationValue } = useNotificationContext();
  const [postTaskGenreNameLoading, setPostTaskGenreNameLoading] =
    useState(false);
  const [deleteTaskGenreNameLoading, setDeleteTaskGenreNameLoading] =
    useState(false);
  const [displayTaskGenreName, displayEditTaskGenreName] = useState("");
  const [editTaskGenreName, setEditTaskGenreName] = useState("");

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    const taskGenreName = openTaskGenreNameEditFormDataArray.find(
      (openTaskGenreNameFormData) =>
        openTaskGenreNameFormData.taskGenreId === Number(id)
    )!.taskGenreName;
    displayEditTaskGenreName(taskGenreName);
    setEditTaskGenreName(taskGenreName);
  }, [openTaskGenreNameEditFormDataArray]);

  const handleOpenEditTaskGenreForm = () => {
    setOpenWorkspaceNameEditForm(false);
    setEditWorkspaceName(workspaceData.name);
    setOpenTaskGenreNameAddForm(false);
    setAddTaskGenreName("");
    setOpenTaskGenreNameEditFormDataArray(
      (prevOpenTaskGenreNameEditFormDataArray) =>
        prevOpenTaskGenreNameEditFormDataArray.map(
          (openTaskGenreNameFormData) =>
            openTaskGenreNameFormData.taskGenreId === Number(id)
              ? {
                  ...openTaskGenreNameFormData,
                  formOpen: true,
                }
              : {
                  ...openTaskGenreNameFormData,
                  taskGenreName: openTaskGenreNameFormData.taskGenreName,
                  formOpen: false,
                }
        )
    );
  };

  const handleCloseEditTaskGenreForm = () => {
    setOpenTaskGenreNameEditFormDataArray(
      (prevOpenTaskGenreNameEditFormDataArray) =>
        prevOpenTaskGenreNameEditFormDataArray.map(
          (openTaskGenreNameFormData) =>
            openTaskGenreNameFormData.taskGenreId === Number(id)
              ? {
                  ...openTaskGenreNameFormData,
                  taskGenreName: openTaskGenreNameFormData.taskGenreName,
                  formOpen: false,
                }
              : openTaskGenreNameFormData
        )
    );
  };

  const handleSubmitEditTaskGenreName = async (e: {
    preventDefault: () => void;
  }) => {
    e.preventDefault();

    setPostTaskGenreNameLoading(true);
    try {
      const { error: workspaceTaskGenreUpdateError } = await clientSupabase
        .from("workspace_task_genre")
        .update({ task_genre_name: editTaskGenreName })
        .eq("id", Number(id));

      if (workspaceTaskGenreUpdateError) {
        throw workspaceTaskGenreUpdateError;
      }

      setOpenTaskGenreNameEditFormDataArray(
        (prevOpenTaskGenreNameEditFormDataArray) =>
          prevOpenTaskGenreNameEditFormDataArray.map(
            (openTaskGenreNameFormData) =>
              openTaskGenreNameFormData.taskGenreId === Number(id)
                ? {
                    ...openTaskGenreNameFormData,
                    taskGenreName: editTaskGenreName,
                    formOpen: false,
                  }
                : openTaskGenreNameFormData
          )
      );

      setNotificationValue({
        message: "Task Genre Name was updated !",
        color: 0,
      });
    } catch (error) {
      console.error("Error Update Task Genre Name", error);
      setNotificationValue({
        message: "Couldn't update Task Genre Name.",
        color: 1,
      });
      setOpenTaskGenreNameEditFormDataArray(
        (prevOpenTaskGenreNameEditFormDataArray) =>
          prevOpenTaskGenreNameEditFormDataArray.map(
            (openTaskGenreNameFormData) =>
              openTaskGenreNameFormData.taskGenreId === Number(id)
                ? {
                    ...openTaskGenreNameFormData,
                    formOpen: false,
                  }
                : openTaskGenreNameFormData
          )
      );
    }
    setPostTaskGenreNameLoading(false);
  };

  const handleDeleteTaskGenreName = async () => {
    setDeleteTaskGenreNameLoading(true);
    try {
      const deleteWorkspaceTaskGenre = workspaceTaskGenreArray.find(
        (workspaceTaskGenre) => workspaceTaskGenre.id === Number(id)
      );

      if (!deleteWorkspaceTaskGenre) {
        throw new Error("deleteWorkspaceTaskGenre couldn't get.");
      }

      const prevWorkspaceTaskGenreArray = [...workspaceTaskGenreArray];
      let updateWorkspaceTaskGenreArray: WorkspaceTaskGenreProps[] = [];

      const filteredWorkspaceTaskGenreArray = workspaceTaskGenreArray
        .filter((item) => item.id !== Number(id))
        .map((item) => {
          if (item.sortId > deleteWorkspaceTaskGenre.sortId) {
            const updatedItem = {
              ...item,
              sortId: item.sortId - 1,
            };
            updateWorkspaceTaskGenreArray.push(updatedItem);
            return updatedItem;
          }
          return item;
        });

      const { error: workspaceTaskGenreDeleteError } = await clientSupabase
        .from("workspace_task_genre")
        .delete()
        .eq("id", Number(id));

      if (workspaceTaskGenreDeleteError) {
        throw workspaceTaskGenreDeleteError;
      }

      for (const WorkspaceTaskGenre of updateWorkspaceTaskGenreArray) {
        const { error: updateError } = await clientSupabase
          .from("workspace_task_genre")
          .update({ sort_id: WorkspaceTaskGenre.sortId })
          .eq("id", WorkspaceTaskGenre.id);

        if (updateError) {
          const rollbackResults = await Promise.allSettled(
            prevWorkspaceTaskGenreArray.map((workspaceTaskGenreArray) =>
              clientSupabase
                .from("workspace_task_genre")
                .update({ sort_id: workspaceTaskGenreArray.sortId })
                .eq("id", workspaceTaskGenreArray.id)
            )
          );
          const rollbackErrors = rollbackResults.filter(
            (result) => result.status === "rejected"
          );
          if (rollbackErrors.length > 0) {
            console.error("ロールバックの一部に失敗しました", rollbackErrors);
          } else {
            console.log("ロールバックに成功しました");
          }
          console.error(
            `Failed to update sort_id for id=${WorkspaceTaskGenre.id}`,
            updateError
          );
          throw updateError;
        }
      }
      setWorkspaceTaskGenreArray(filteredWorkspaceTaskGenreArray);
      setOpenTaskGenreNameEditFormDataArray(
        (prevOpenTaskGenreNameEditFormDataArray) =>
          prevOpenTaskGenreNameEditFormDataArray.filter(
            (openTaskGenreNameFormData) =>
              openTaskGenreNameFormData.taskGenreId !== Number(id)
          )
      );
      setNotificationValue({
        message: "Task Genre Name was deleted !",
        color: 0,
      });
    } catch (error) {
      console.error("Error Delete Task Genre Name", error);
      setNotificationValue({
        message: "Couldn't delete Task Genre Name.",
        color: 1,
      });
    }
    setDeleteTaskGenreNameLoading(false);
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {!openTaskGenreNameEditFormDataArray.find(
        (openTaskGenreNameForm) =>
          openTaskGenreNameForm.taskGenreId === Number(id)
      )!.formOpen ? (
        <div className={styles[`task-genre-item`]}>
          <div {...listeners} className={styles.dragHandle}>
            <span
              className={classNames("material-symbols-outlined", styles.app)}
            >
              apps
            </span>
          </div>
          <div className={styles[`task-genre-name`]}>
            {displayTaskGenreName}
          </div>
          <div className={styles[`icon-area`]}>
            <span
              className={classNames("material-symbols-outlined", styles.edit)}
              onClick={handleOpenEditTaskGenreForm}
            >
              {" "}
              edit{" "}
            </span>

            {deleteTaskGenreNameLoading ? (
              <div className={styles[`delete-button-spinner`]}></div>
            ) : (
              <span
                className={classNames(
                  "material-symbols-outlined",
                  styles.delete
                )}
                onClick={handleDeleteTaskGenreName}
              >
                {" "}
                delete{" "}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className={styles[`task-genre-name-edit-form-area`]}>
          <form onSubmit={handleSubmitEditTaskGenreName}>
            <input
              type="text"
              value={editTaskGenreName}
              onChange={(e) => setEditTaskGenreName(e.target.value)}
              placeholder="Task Genre Name"
              required
              className={styles[`task-genre-name-form`]}
            />
            <div className={styles[`task-genre-name-button-area`]}>
              <button
                className={styles[`cancel-button`]}
                type="button"
                onClick={handleCloseEditTaskGenreForm}
              >
                <span
                  className={classNames(
                    "material-symbols-outlined",
                    styles.cancel
                  )}
                >
                  close_small
                </span>
              </button>

              <button className={styles[`update-button`]} type="submit">
                {postTaskGenreNameLoading ? (
                  <div className={styles[`update-button-spinner`]}></div>
                ) : (
                  <span
                    className={classNames(
                      "material-symbols-outlined",
                      styles.check
                    )}
                  >
                    check_small
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default SuspenseEditWorkspace;
