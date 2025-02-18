import ReactMarkdown from "react-markdown";
import styles from "./wiki.module.css";
import React, { useEffect, useState } from "react";
import classNames from "classnames";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import Image from "next/image";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";
import { clientSupabase } from "@/app/lib/supabase/client";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import DeleteConfirmModal from "@/app/component/deleteConfirmModal/deleteConfirmModal";
import { postMailNotifications } from "@/app/lib/postMailNotifications";

interface WikiDataProps {
  id: number;
  title: string;
  content: string;
}

interface WikiDataListProps {
  smallProjectId: number;
  wikiDataArray: {
    id: number;
    title: string;
    content: string;
    small_project_id: number;
  }[];
}

interface WikiProps {
  userId: number;
  smallProjectIdList: number[];
  displaySmallProjectId: number | null;
  wikiDataList: WikiDataListProps[];
}

const Wiki: React.FC<WikiProps> = ({
  userId,
  smallProjectIdList,
  displaySmallProjectId,
  wikiDataList,
}) => {
  const [useDisplaySmallProjectId, setUseDisplaySmallProjectId] = useState(0);
  const [wikiData, setWikiData] = useState<WikiDataProps[]>([]);
  const [enteredWikiData, setEnteredWikiData] = useState<WikiDataProps>({
    id: 0,
    title: "",
    content: "",
  });
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [displayWikiNumber, setDisplayWikiNumber] = useState(0);
  const [updateFlg, setUpdateFlg] = useState(false);
  const [postLoading, setPostLoading] = useState(false);

  const { pageUpdated, setPageUpdated } = usePageUpdateContext();
  const { setNotificationValue } = useNotificationContext();

  useEffect(() => {
    const changedDisplaySmallProjectId =
      displaySmallProjectId &&
      smallProjectIdList.includes(displaySmallProjectId)
        ? displaySmallProjectId!
        : smallProjectIdList[0];

    setUseDisplaySmallProjectId(changedDisplaySmallProjectId);

    if (wikiDataList) {
      const findWikiData = wikiDataList
        .find(
          (wikiData) => wikiData.smallProjectId === changedDisplaySmallProjectId
        )
        ?.wikiDataArray.map((wikiData) => ({
          id: wikiData.id,
          title: wikiData.title,
          content: wikiData.content,
        }));
      setWikiData(findWikiData ? findWikiData : []);

      if (updateFlg && findWikiData && findWikiData.length > wikiData.length) {
        setDisplayWikiNumber(findWikiData?.length - 1);
        setUpdateFlg(!updateFlg);
      }
    }
  }, [pageUpdated, displaySmallProjectId]);

  const onClose = () => {
    setEditFormOpen(false);
    setAddFormOpen(false);
    setEnteredWikiData({
      id: 0,
      title: "",
      content: "",
    });
  };

  const onAddFormOpen = () => {
    if (editFormOpen) {
      return;
    }
    setAddFormOpen(!addFormOpen);
  };

  const onEditFormOpen = (displayWikiNumber: number) => {
    if (wikiData.length === 0 || addFormOpen) {
      return;
    }
    setEnteredWikiData({
      id: wikiData[displayWikiNumber].id,
      title: wikiData[displayWikiNumber].title,
      content: wikiData[displayWikiNumber].content,
    });
    setEditFormOpen(!editFormOpen);
  };

  const openModal = () => {
    if (wikiData.length === 0 || editFormOpen || addFormOpen) {
      return;
    }
    setDeleteModalOpen(true);
  };

  const closeModal = () => {
    setDeleteModalOpen(false);
  };

  const handleDeleteWikiPage = async () => {
    try {
      if (wikiData.length === 0) {
        return;
      }

      const { error: wikiDeleteError } = await clientSupabase
        .from("wiki")
        .delete()
        .eq("id", wikiData[displayWikiNumber].id);

      if (wikiDeleteError) {
        throw wikiDeleteError;
      }

      setNotificationValue({
        message: "Wiki Page was deleted.",
        color: 0,
      });
    } catch (error) {
      console.error("Error Delete Wiki Data: ", error);
      setNotificationValue({ message: "Couldn't delete Wiki Page.", color: 1 });
    }
    setPageUpdated(true);
    if (displayWikiNumber === wikiData.length - 1) {
      setDisplayWikiNumber(0);
    }
    setDeleteModalOpen(false);
  };

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();

    if (postLoading) return;
    setPostLoading(true);

    try {
      if (addFormOpen) {
        const { error: insertWikiDataError } = await clientSupabase
          .from("wiki")
          .insert({
            title: enteredWikiData.title,
            content: enteredWikiData.content,
            small_project_id: useDisplaySmallProjectId,
          });

        if (insertWikiDataError) {
          throw insertWikiDataError;
        }

        setAddFormOpen(!addFormOpen);

        const { data: smallProjectData } = await clientSupabase
          .from("small_projects")
          .select(
            "small_project_name, projects(*), small_project_users(user_id)"
          )
          .eq("id", displaySmallProjectId)
          .single();

        if (smallProjectData) {
          const postEmailNotificationsError = await postMailNotifications(
            userId,
            null,
            (Array.isArray(smallProjectData.projects)
              ? smallProjectData.projects[0]
              : smallProjectData.projects
            ).project_name,
            smallProjectData.small_project_name,
            enteredWikiData.title,
            0,
            smallProjectData.small_project_users.map((users) => users.user_id)
          );

          if (postEmailNotificationsError) {
            console.error(
              "Error post mail notifications ",
              postEmailNotificationsError
            );
          }
        }
      } else if (editFormOpen) {
        const { error: updateWikiDataError } = await clientSupabase
          .from("wiki")
          .update({
            title: enteredWikiData.title,
            content: enteredWikiData.content,
          })
          .eq("id", wikiData[displayWikiNumber].id);

        if (updateWikiDataError) {
          throw updateWikiDataError;
        }
        setEditFormOpen(!editFormOpen);
      }
      setNotificationValue({
        message: "Wiki Page was added.",
        color: 0,
      });
      setUpdateFlg(true);
    } catch (error) {
      console.error(
        addFormOpen ? "Error Add Wiki Data " : "Error Update Wiki Data ",
        error
      );
      setNotificationValue({
        message: addFormOpen
          ? "Couldn't add Wiki Data."
          : "Couldn't update Wiki Data",
        color: 1,
      });
    }
    setPostLoading(false);
    onClose();
    setPageUpdated(true);
  };

  return (
    <>
      {deleteModalOpen && (
        <DeleteConfirmModal
          onConfirm={handleDeleteWikiPage}
          closeModal={closeModal}
        />
      )}
      <div className={styles[`wiki-page-area`]}>
        <div className={styles[`container-area`]}>
          <div className={styles[`left-area`]}>
            <div className={styles[`page-list-area-container`]}>
              <div className={styles[`page-list-area`]}>
                <div className={styles[`page-list-title`]}> Page List</div>
                <div className={styles[`list-container`]}>
                  <div className={styles[`list-area`]}>
                    {wikiData.length > 0 &&
                      wikiData.map((wiki, index) => (
                        <div
                          className={classNames(
                            styles.list,
                            index === displayWikiNumber &&
                              styles[`display-list`]
                          )}
                          key={index}
                          onClick={() => setDisplayWikiNumber(index)}
                        >
                          {wiki.title}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
            <div className={styles[`markdown-explain-area`]}>
              <div className={styles[`markdown-explain-title`]}>
                {" "}
                Markdown Explain
              </div>
              <div className={styles[`markdown-explain-container`]}>
                <div className={styles[`markdown-explain`]}>
                  <p className={styles[`explain-title`]}>1.見出し</p>
                  <pre>
                    <code>
                      # H1 見出し
                      <br />
                      ## H2 見出し
                      <br />
                      ### H3 見出し
                    </code>
                  </pre>
                  <h1>H1 見出し</h1>
                  <h2>H2 見出し</h2>
                  <h3>H3 見出し</h3>
                  <hr />
                  <p className={styles[`explain-title`]}>2.協調</p>
                  <pre>
                    <code>
                      **太字**
                      <br />
                      *斜体*
                      <br />
                      ~~取り消し線~~
                    </code>
                  </pre>
                  <br />
                  <strong>太字</strong>
                  <br />
                  <em>斜体</em>
                  <br />
                  <del>取り消し線</del>
                  <br />
                  <hr />
                  <p className={styles[`explain-title`]}>3.リスト</p>
                  <pre>
                    <code>
                      - 順序なしリスト
                      <br />
                      {"  "}- サブ項目1
                      <br />
                      {"  "}- サブ項目2
                      <br />
                      <br />
                      1. 順序ありリスト
                      <br />
                      2. 次の項目
                    </code>
                  </pre>
                  <ul>
                    <li>
                      順序なしリスト
                      <ul>
                        <li>サブ項目1</li>
                        <li>サブ項目2</li>
                      </ul>
                    </li>
                  </ul>
                  <ol>
                    <li>順序ありリスト</li>
                    <li>次の項目</li>
                  </ol>
                  <hr />
                  <p className={styles[`explain-title`]}>4.リンク</p>
                  <pre>
                    <code>[Google](https://www.google.com)</code>
                  </pre>
                  <p>
                    <a href="https://www.google.com">Google</a>
                  </p>
                  <hr />
                  <p className={styles[`explain-title`]}>5.引用</p>
                  <pre>
                    <code>
                      &gt; 引用
                      <br />
                      &gt;&gt; ネストされた引用
                    </code>
                  </pre>
                  <blockquote>引用</blockquote>
                  <blockquote>
                    <blockquote>ネストされた引用</blockquote>
                  </blockquote>
                  <hr />
                  <p className={styles[`explain-title`]}>6.コード</p>
                  <pre>
                    <code>
                      インラインコード:
                      <br />
                      `console.log("Hello, Markdown!")`
                      <br />
                      <br />
                      コードブロック:
                      <br />
                      ```
                      <br />
                      console.log("Hello, Markdown!")
                      <br />
                      ```
                    </code>
                  </pre>
                  <p>
                    インラインコード:{" "}
                    <code>console.log("Hello, Markdown!")</code>
                  </p>
                  コードブロック:
                  <pre>
                    <code>console.log("Hello, Markdown!")</code>
                  </pre>
                  <br />
                  <hr />
                  <p className={styles[`explain-title`]}>6.テーブル</p>
                  <pre>
                    <code>
                      | 名前 | 年齢 | 職業 |
                      <br />
                      |--------|------|----------|
                      <br />
                      | 田中 | 25 | エンジニア |
                      <br />
                      | 鈴木 | 30 | デザイナー |
                      <br />| 佐藤 | 28| マーケター |
                    </code>
                  </pre>
                  <table>
                    <thead>
                      <tr>
                        <th>名前</th>
                        <th>年齢</th>
                        <th>職業</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>田中</td>
                        <td>25</td>
                        <td>エンジニア</td>
                      </tr>
                      <tr>
                        <td>鈴木</td>
                        <td>30</td>
                        <td>デザイナー</td>
                      </tr>
                      <tr>
                        <td>佐藤</td>
                        <td>28</td>
                        <td>マーケター</td>
                      </tr>
                    </tbody>
                  </table>
                  <br />
                  <hr />
                  <p className={styles[`explain-title`]}>7.チェックリスト</p>
                  <pre>
                    <code>
                      - [x] 完了したタスク
                      <br />- [ ] 未完了のタスク
                    </code>
                  </pre>
                  <ul>
                    <li className={styles[`check-list-container`]}>
                      <input type="checkbox" defaultChecked={true} />{" "}
                      完了したタスク
                    </li>
                    <li className={styles[`check-list-container`]}>
                      <input type="checkbox" defaultChecked={false} />{" "}
                      未完了のタスク
                    </li>
                  </ul>
                  <hr />
                  <p className={styles[`explain-title`]}>8.水平線</p>
                  <pre>
                    <code>
                      ---
                      <br />
                      ***
                      <br />
                      ___
                      <br />
                      ---
                    </code>
                  </pre>
                  <br />
                  <hr />
                  <hr />
                  <hr />
                  <hr />
                  <br />
                  <hr />
                  <p className={styles[`explain-title`]}>9.HTML埋め込み</p>
                  <pre>
                    <code>
                      &lt;p style="color:
                      red;"&gt;これは赤色のテキストです。&lt;/p&gt;
                    </code>
                  </pre>
                  <p style={{ color: "red" }}>これは赤色のテキストです。</p>
                  <hr />
                  <p className={styles[`explain-title`]}>10.改行</p>
                  <pre>
                    <code>
                      br1個&lt;br&gt;
                      <br />
                      br2個&lt;br&gt;&lt;br&gt;
                      <br />
                      br3個&lt;br&gt;&lt;br&gt;&lt;br&gt;
                      <br />
                      br4個&lt;br&gt;&lt;br&gt;&lt;br&gt;&lt;br&gt;
                    </code>
                  </pre>
                  <br />
                  <div>br1個</div>
                  <div>br2個</div>
                  <br />
                  <div>br3個</div>
                  <br />
                  <br />
                  <div>br4個</div>
                  <br />
                  <hr />
                  <p className={styles[`explain-title`]}>11.半角スペース</p>
                  <pre>
                    <code>
                      <div>&amp;nbsp; 半角スペース</div>
                      <div>&amp;nbsp; &amp;nbsp; 半角スペース</div>
                      <div>&amp;nbsp; &amp;nbsp; &amp;nbsp; 半角スペース</div>
                    </code>
                  </pre>
                  <br />
                  &nbsp; 半角スペース
                  <br />
                  &nbsp; &nbsp; 半角スペース
                  <br />
                  &nbsp; &nbsp; &nbsp; 半角スペース
                </div>
              </div>
            </div>
          </div>
          <div className={styles[`right-area`]}>
            <div className={styles[`wiki-area`]}>
              <div className={styles[`button-area`]}>
                <div className={styles[`button-container`]}>
                  <span
                    className={classNames(
                      "material-symbols-outlined",
                      styles[`add-button`]
                    )}
                    onClick={() => onAddFormOpen()}
                  >
                    {" "}
                    add{" "}
                  </span>
                  <span
                    className={classNames(
                      "material-symbols-outlined",
                      styles[`edit-button`]
                    )}
                    onClick={() => onEditFormOpen(displayWikiNumber)}
                  >
                    {" "}
                    edit{" "}
                  </span>
                  <span
                    className={classNames(
                      "material-symbols-outlined",
                      styles[`delete-button`]
                    )}
                    onClick={() => openModal()}
                  >
                    {" "}
                    delete{" "}
                  </span>
                </div>
              </div>

              <div className={styles[`wiki-content-area`]}>
                {!addFormOpen && !editFormOpen ? (
                  <div className={styles[`wiki-container`]}>
                    <div className={styles[`title-area`]}>
                      {wikiData.length > 0
                        ? wikiData[displayWikiNumber].title
                        : "No Wiki Page"}
                    </div>

                    <div className={styles[`content-area`]}>
                      <Image
                        src="/img/background-image2.jpeg"
                        alt="background-image2"
                        className={styles[`background-image2`]}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        priority={true}
                      />

                      <div className={styles[`markdown-container`]}>
                        {" "}
                        <ReactMarkdown
                          rehypePlugins={[rehypeRaw]}
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ node, ...props }) => (
                              <a
                                {...props}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {props.children}
                              </a>
                            ),
                          }}
                        >
                          {wikiData.length > 0
                            ? wikiData[displayWikiNumber].content
                            : ""}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className={styles[`form-area`]}>
                      <div className={styles[`title-form`]}>
                        <input
                          type="text"
                          value={enteredWikiData.title}
                          onChange={(e) =>
                            setEnteredWikiData({
                              id: enteredWikiData.id,
                              title: e.target.value,
                              content: enteredWikiData.content,
                            })
                          }
                          className={styles[`title-form-input`]}
                          required
                          placeholder="Wiki Page Title"
                        />
                      </div>

                      <div className={styles[`content-area`]}>
                        <Image
                          src="/img/background-image2.jpeg"
                          alt="background-image2"
                          className={styles[`background-image2`]}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          priority={true}
                        />

                        <div className={styles[`content-form`]}>
                          <textarea
                            value={enteredWikiData.content}
                            onChange={(e) =>
                              setEnteredWikiData({
                                id: enteredWikiData.id,
                                title: enteredWikiData.title,
                                content: e.target.value,
                              })
                            }
                            className={styles[`content-form-input`]}
                            required
                            placeholder="Enter Markdown Content..."
                          ></textarea>
                        </div>

                        <div className={styles[`post-button-area`]}>
                          <button className={styles.cancel} onClick={onClose}>
                            Cancel
                          </button>
                          <button className={styles.add} type="submit">
                            {postLoading ? (
                              <div className={styles[`button-spinner`]}></div>
                            ) : addFormOpen ? (
                              "Add"
                            ) : (
                              "Update"
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Wiki;
