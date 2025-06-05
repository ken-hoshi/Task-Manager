import { clientSupabase } from "@/app/lib/supabase/client";
import { useRouter } from "next/navigation";
import styles from "./header.module.css";
import classNames from "classnames";
import { useEffect, useRef, useState } from "react";
import MailNotificationList from "../mailNotificationList/mailNotificationList";
import { getMailNotifications } from "@/app/lib/api/getMailNotification";
import { formatDateTime } from "@/app/lib/formatDateTime";
import { Logout } from "@/app/hooks/logout";
import { useDisplayWorkspaceIdContext } from "@/app/provider/displayWorkspaceIdProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";
import ProjectPopup from "../projectPopup/projectPopup";

interface WorkspaceProps {
  id: number;
  workspaceName: string;
}

interface HeaderProps {
  workspaceDataArray: WorkspaceProps[] | null;
  projectId: number | null;
  projectName: string | null;
  userId: number;
}

type Notification = {
  id: number;
  message: string;
  isRead: boolean;
  timestamp: string;
};

const Header: React.FC<HeaderProps> = ({
  workspaceDataArray,
  projectId,
  projectName,
  userId,
}) => {
  const router = useRouter();
  const { useLogout } = Logout();
  const { displayWorkspaceId, setDisplayWorkspaceId } =
    useDisplayWorkspaceIdContext();
  const { setPageUpdated } = usePageUpdateContext();
  const [showProjectPopup, setShowProjectPopup] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [showCancelButton, setShowCancelButton] = useState(false);
  const [showMailNotificationList, setShowMailNotificationList] =
    useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [workspaceArray, setWorkspaceArray] = useState<WorkspaceProps[] | null>(
    null
  );
  const [displayWorkspaceName, setDisplayWorkspaceName] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [pullDownWorkspaceData, setPullDownWorkspaceData] = useState<
    any[] | undefined
  >(undefined);

  const pullDownMenuRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const mailRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutsideList);
    document.addEventListener("mousedown", handleClickOutsidePullDown);

    if (workspaceDataArray && workspaceDataArray.length > 0) {
      setWorkspaceArray(workspaceDataArray);
      setPullDownWorkspaceData(
        workspaceDataArray.filter(
          (workspace: WorkspaceProps) =>
            workspace.id !==
            (displayWorkspaceId ? displayWorkspaceId : workspaceDataArray[0].id)
        )
      );
      const displayWorkspaceName = workspaceDataArray.find(
        (workspace) =>
          workspace.id ===
          (displayWorkspaceId ? displayWorkspaceId : workspaceDataArray[0].id)
      )?.workspaceName;

      if (displayWorkspaceName) {
        setDisplayWorkspaceName(displayWorkspaceName);
      }
    }

    (async () => {
      const mailNotifications = await getMailNotifications(
        userId,
        displayWorkspaceId!
      );

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (mailNotifications && mailNotifications.length > 0) {
        const mailNotificationList: Notification[] = [];
        await Promise.all(
          mailNotifications.map(async (mailNotification) => {
            const specifiedDate = new Date(mailNotification.created_at);
            const dateWithSevenDaysAdded = new Date(specifiedDate);
            dateWithSevenDaysAdded.setDate(specifiedDate.getDate() + 7);

            if (dateWithSevenDaysAdded > today || !mailNotification.isRead) {
              mailNotificationList.push({
                id: mailNotification.id,
                message: mailNotification.text,
                isRead: mailNotification.isRead,
                timestamp: formatDateTime(mailNotification.created_at),
              });
            } else {
              const { error: mailNotificationsDeleteError } =
                await clientSupabase
                  .from("mail_notifications")
                  .delete()
                  .eq("id", mailNotification.id);

              if (mailNotificationsDeleteError) {
                throw mailNotificationsDeleteError;
              }
            }
          })
        );
        setNotifications(mailNotificationList);
        setUnreadCount(
          mailNotificationList.filter((notification) => !notification.isRead)
            .length
        );
      }
    })();
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideList);
      document.removeEventListener("mousedown", handleClickOutsidePullDown);
    };
  }, [isOpen, showMailNotificationList, displayWorkspaceId]);

  const handleClickOutsideList = (event: MouseEvent) => {
    if (
      listRef.current &&
      !listRef.current.contains(event.target as Node) &&
      mailRef.current &&
      !mailRef.current.contains(event.target as Node)
    ) {
      setShowMailNotificationList(false);
    }
  };

  const handleClickOutsidePullDown = (event: MouseEvent) => {
    if (
      pullDownMenuRef.current &&
      !pullDownMenuRef.current.contains(event.target as Node)
    ) {
      setIsDropdownOpen(false);
    }
  };

  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  const handleSelectWorkspace = (workspaceId: number) => {
    setDisplayWorkspaceId(workspaceId);
    setPageUpdated(true);
    setIsDropdownOpen(false);
  };

  const toggleMenu = () => {
    if (showMailNotificationList) {
      setShowMailNotificationList(false);
    }
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => setShowButtons(true), 50);
      setTimeout(() => setShowCancelButton(true), 50);
    } else {
      setShowCancelButton(false);
      setShowButtons(false);
    }
  };

  const handleBack = () => {
    if (projectName) router.push("/task");
  };

  const logout = async () => {
    await useLogout();
  };

  const handleTransitionAccount = () => {
    router.push(`/account?userId=${userId}`);
  };

  return (
    <>
      <div className={styles.header}>
        {projectName && (
          <div className={styles[`back-button-container`]}>
            {" "}
            <span
              className={classNames("material-symbols-outlined", styles.back)}
              onClick={handleBack}
            >
              arrow_back
            </span>
          </div>
        )}

        {projectName && (
          <div className={styles[`project-name-area`]}>
            <div className={styles[`project-name`]}>{projectName}</div>
            <div className={styles[`edit-button-container`]}>
              <span
                className={classNames("material-symbols-outlined", styles.edit)}
                onClick={() => setShowProjectPopup(!showProjectPopup)}
              >
                {" "}
                edit{" "}
              </span>
              {showProjectPopup && (
                <ProjectPopup
                  onClose={() => setShowProjectPopup(!showProjectPopup)}
                  projectId={projectId}
                  userId={userId}
                />
              )}
            </div>
          </div>
        )}
        {workspaceArray && (
          <div className={styles[`workspace-name-area`]}>
            {workspaceArray && workspaceArray.length > 1 && (
              <div className={styles[`pull-down-container`]}>
                <span
                  className={classNames(
                    "material-symbols-outlined",
                    styles[`pull-down`]
                  )}
                  onClick={toggleDropdown}
                >
                  arrow_right
                </span>
                {isDropdownOpen && (
                  <div
                    className={styles[`dropdown-menu`]}
                    ref={pullDownMenuRef}
                  >
                    {pullDownWorkspaceData ? (
                      pullDownWorkspaceData.map((workspace: WorkspaceProps) => (
                        <div
                          key={workspace.id}
                          className={styles[`dropdown-item`]}
                          onClick={() => handleSelectWorkspace(workspace.id)}
                        >
                          {workspace.workspaceName}
                        </div>
                      ))
                    ) : (
                      <div className={styles[`dropdown-item`]}>
                        No Workspace
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className={styles[`workspace-name`]}>
              {displayWorkspaceName}
            </div>

            <span
              className={classNames("material-symbols-outlined", styles.edit)}
              onClick={() =>
                router.push(
                  `/editWorkspace?workspaceId=${displayWorkspaceId}&userId=${userId}`
                )
              }
            >
              {" "}
              edit{" "}
            </span>
          </div>
        )}

        <div className={styles.container}>
          {isOpen && (
            <div className={styles.menu}>
              <span
                onClick={handleTransitionAccount}
                className={classNames(
                  "material-symbols-outlined",
                  styles.account,
                  { [styles.fadeIn1]: showButtons }
                )}
              >
                account_circle
              </span>

              <span
                className={classNames(
                  "material-symbols-outlined",
                  styles.mail,
                  {
                    [styles.fadeIn2]: showButtons,
                  }
                )}
                onClick={() =>
                  setShowMailNotificationList(!showMailNotificationList)
                }
                ref={mailRef}
              >
                mail
                {unreadCount > 0 && (
                  <span className={styles.badge}>{unreadCount}</span>
                )}
              </span>

              <button
                onClick={logout}
                className={classNames(styles[`logout-button`], {
                  [styles.fadeIn3]: showButtons,
                })}
              >
                Logout
              </button>
            </div>
          )}
          <div
            className={classNames(styles.hamburger, {
              [styles[`none-hamburger`]]: showButtons,
            })}
            onClick={toggleMenu}
          >
            <div
              className={classNames(styles.line, {
                [styles.fadeOut1]: showButtons,
              })}
            ></div>
            <div
              className={classNames(styles.line, {
                [styles.fadeOut2]: showButtons,
              })}
            ></div>
            <div
              className={classNames(styles.line, {
                [styles.fadeOut3]: showButtons,
              })}
            ></div>
            {unreadCount > 0 && !isOpen && (
              <span className={styles.badge}>{unreadCount}</span>
            )}
          </div>

          <span
            className={classNames("material-symbols-outlined", styles.cancel, {
              [styles.fadeIn4]: showCancelButton,
            })}
            onClick={toggleMenu}
          >
            close_small
          </span>
        </div>
      </div>
      {showMailNotificationList && (
        <MailNotificationList notifications={notifications} listRef={listRef} />
      )}
    </>
  );
};

export default Header;
