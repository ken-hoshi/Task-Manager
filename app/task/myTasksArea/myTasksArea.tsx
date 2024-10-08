import classNames from "classnames";
import styles from "./myTasksArea.module.css";
import { Arrow } from "../../component/arrow/arrow";
import React, { useEffect, useState } from "react";
import Comment from "../../component/comment/comment";
import DeleteButton from "../../component/deleteButton/deleteButton";
import AddButton from "../../component/addButton/addButton";
import { useFlashDisplayContext } from "../../provider/flashDisplayProvider";
import EditButton from "../../component/editButton/editButton";
import { clientSupabase } from "../../lib/supabase/client";
import { useNotificationContext } from "../../provider/notificationProvider";
import { usePageUpdateContext } from "../../provider/pageUpdateProvider";
import Select, { SingleValue } from "react-select";
import { selectBoxStyles } from "../selectBoxStyles";
import { fetchAttachmentFiles } from "../../lib/fetchAttachmentFiles";

interface StatusProps {
  id: number;
  status: string;
}

interface MyTasksAreaProps {
  myTasks: any[];
  myTaskArrows: boolean[];
  setMyTaskArrows: React.Dispatch<React.SetStateAction<boolean[]>>;
  userId: number;
  statuses: StatusProps[];
}

interface Option {
  value: number;
  label: string;
}

const MyTasksArea: React.FC<MyTasksAreaProps> = ({
  myTasks,
  myTaskArrows,
  setMyTaskArrows,
  userId,
  statuses,
}) => {
  const { setNotificationValue } = useNotificationContext();
  const { setPageUpdated, pageUpdated } = usePageUpdateContext();
  const { newItem } = useFlashDisplayContext();

  const [statusList, setStatusList] = useState<StatusProps[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<Option[]>([]);
  const [attachmentFileList, setAttachmentFileList] = useState<File[][]>([[]]);
  const [downloadUrlList, setDownloadUrlList] = useState<(string | null)[][]>([
    [],
  ]);

  useEffect(() => {
    setStatusList(statuses);

    const myTaskStatuses = myTasks.map((myTask) => {
      return {
        value: myTask.status_id,
        label: myTask.task_status.status,
      };
    });
    setSelectedStatuses(myTaskStatuses);

    const fetchAttachmentFilesData = async () => {
      if (myTasks && myTasks.length > 0) {
        const attachmentFilesPromises = myTasks.map(async (myTask) => {
          const taskId = myTask.id;
          return await fetchAttachmentFiles(1, taskId);
        });
        const attachmentFiles = await Promise.all(attachmentFilesPromises);
        setAttachmentFileList(attachmentFiles);

        if (attachmentFiles.length > 0) {
          const urlList = attachmentFiles.map((subList) =>
            subList.map((file) => {
              try {
                return URL.createObjectURL(file);
              } catch (error) {
                console.error("Failed to create object URL:", error);
                return null;
              }
            })
          );
          setDownloadUrlList(urlList);
        }
      }
    };
    fetchAttachmentFilesData();
  }, [pageUpdated]);

  const getStatusOptions = (selectedStatusId: number): Option[] => {
    return statusList
      .filter((status) => status.id !== selectedStatusId)
      .map((status) => ({ value: status.id, label: status.status }));
  };

  const handleStatusChange = async (
    taskId: number,
    index: number,
    selectedStatusOptions: SingleValue<Option>
  ) => {
    try {
      const { error } = await clientSupabase
        .from("tasks")
        .update({ status_id: selectedStatusOptions!.value })
        .eq("id", taskId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Error update status:", error);
      setNotificationValue({
        message: "Couldn't change the Status data.",
        color: 1,
      });
    }
    setPageUpdated(true);
  };

  const handleNullCheck = (index: number, i: number) => {
    if (!downloadUrlList[index][i]) {
      console.error("Attached File is null.");
      setNotificationValue({
        message: "Couldn't download Attached File.",
        color: 1,
      });
    }
  };

  return (
    <div className={styles[`my-task-area`]}>
      <div className={styles.title}>
        <span className={styles["title-icon"]}>📁</span>
        My Tasks
      </div>

      <table>
        <thead>
          <tr>
            <th className={styles[`col-task-name`]}>
              Task Name
              <div className={styles.separator}></div>
            </th>
            <th className={styles[`col-status`]}>
              Status
              <div className={styles.separator}></div>
            </th>
            <th className={styles[`col-deadline`]}>
              Deadline
              <div className={styles.separator}></div>
            </th>
            <th className={styles[`col-assigned-person`]}>
              Assigned
              <div className={styles.separator}></div>
            </th>
            <th className={styles[`col-actions`]}>
              <AddButton target={1} userId={userId} />
            </th>
          </tr>
        </thead>
        <tbody>
          {myTasks.length > 0 ? (
            myTasks?.map((myTask, index) => (
              <React.Fragment key={myTask.id}>
                <tr
                  className={
                    myTask.id == newItem.id && newItem.target == 1
                      ? styles.blink
                      : ""
                  }
                >
                  <td className={styles[`col-task-name`]}>
                    <div className={styles[`arrow-container`]}>
                      <Arrow
                        setMyTasksArrows={setMyTaskArrows}
                        myTasksArrows={myTaskArrows}
                        index={index}
                        target={1}
                      />
                    </div>
                    <p className={styles[`task-name`]}>{myTask.task_name}</p>
                  </td>
                  <td className={styles[`col-status`]}>
                    <Select
                      value={selectedStatuses[index]}
                      options={getStatusOptions(myTask.status_id)}
                      styles={{
                        ...selectBoxStyles,
                        control: (baseStyles, state) => ({
                          ...selectBoxStyles.control(baseStyles, {
                            selectProps: { statusId: myTask.status_id },
                          }),
                        }),
                      }}
                      onChange={(selectedOption) =>
                        handleStatusChange(myTask.id, index, selectedOption)
                      }
                      isSearchable={false}
                    />
                  </td>
                  <td className={styles[`col-deadline`]}>
                    {myTask.deadline_date}
                  </td>
                  <td className={styles[`col-assigned-person`]}>
                    {myTask.users.name}
                  </td>
                  <td className={styles[`col-actions`]}>
                    <EditButton
                      taskId={myTask.id}
                      projectId={null}
                      userId={userId}
                    />
                    <DeleteButton
                      taskId={myTask.id}
                      projectId={null}
                      userId={userId}
                    />
                  </td>
                </tr>
                <tr
                  className={
                    myTaskArrows[index]
                      ? styles.detailOpen
                      : styles.detailHidden
                  }
                >
                  <td colSpan={5}>
                    <div className={styles[`scrollable-content`]}>
                      <dl>
                        <div className={styles[`scrollable-content-container`]}>
                          <div className={styles[`project-part`]}>
                            <dt>Project</dt>
                            <dd className={styles[`project-name`]}>
                              {myTask.projects.project_name}
                            </dd>
                          </div>
                          <div className={styles[`period-part`]}>
                            <dt>Period</dt>
                            <dd>
                              {myTask.start_date}　〜　{myTask.deadline_date}
                            </dd>
                          </div>
                        </div>
                        <dt>Detail</dt>
                        <dd className={styles[`detail-area`]}>
                          {myTask.details ? myTask.details : "No Detail"}
                        </dd>
                        <dt>Attached Files</dt>
                        <dd className={styles["attachmentFile-area"]}>
                          {attachmentFileList[index] &&
                          attachmentFileList[index].length > 0
                            ? attachmentFileList[index].map((file: any, i) => (
                                <div
                                  className={
                                    styles["display-attachmentFile-container"]
                                  }
                                  key={i}
                                >
                                  <div className={styles["file-info"]}>
                                    <a
                                      href={downloadUrlList[index][i] || "#"}
                                      onClick={() => handleNullCheck(index, i)}
                                      download={file.name}
                                    >
                                      <span
                                        className={classNames(
                                          "material-symbols-outlined",
                                          styles.downloadIcon
                                        )}
                                      >
                                        download
                                      </span>
                                    </a>
                                  </div>
                                  <p>{file.name}</p>
                                </div>
                              ))
                            : "No Attached File"}
                        </dd>

                        <Comment userId={userId} taskId={myTask.id} />
                      </dl>
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            ))
          ) : (
            <tr>
              <td colSpan={3} className={styles[`non-tasks`]}>
                No Task
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default MyTasksArea;
