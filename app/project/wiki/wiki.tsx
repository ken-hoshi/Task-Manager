"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { ChevronDown, FileText, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { clientSupabase } from "@/app/lib/supabase/client";
import { postMailNotifications } from "@/app/lib/postMailNotifications";
import { useDisplayWorkspaceIdContext } from "@/app/provider/displayWorkspaceIdProvider";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";

// 書いた HTML のうち、スクリプトが動くもの（<script>・onerror など）だけを取り除く。説明にある style 属性は残す
export const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "style"],
  },
};

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

// Markdown の書き方の早見
const MARKDOWN_GUIDE: { label: string; code: string }[] = [
  { label: "見出し", code: "# 見出し1\n## 見出し2\n### 見出し3" },
  { label: "強調", code: "**太字**\n*斜体*\n~~取り消し線~~" },
  { label: "リスト", code: "- 項目\n  - 子の項目\n\n1. 番号付き\n2. 次の項目" },
  { label: "チェックリスト", code: "- [x] 完了\n- [ ] 未完了" },
  { label: "リンク", code: "[名前](https://example.com)" },
  { label: "引用", code: "> 引用\n>> 入れ子の引用" },
  { label: "コード", code: "`インライン`\n\n```\nコードブロック\n```" },
  { label: "表", code: "| 名前 | 年齢 |\n|------|------|\n| 田中 | 25 |" },
  { label: "水平線", code: "---" },
  { label: "HTML", code: '<p style="color: red;">赤い文字</p>' },
  { label: "改行", code: "1行目<br>2行目" },
  { label: "半角スペース", code: "&nbsp;&nbsp;字下げ" },
];

// 本文の文字の決まり。Tailwind の土台は見出しやリストの見た目を消すので、ここで付け直す
const MARKDOWN_CLASSES = cn(
  "min-w-0 text-sm leading-relaxed break-words",
  "[&_p]:my-2 [&_hr]:my-4 [&_hr]:border-border",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
  // チェックリストの行だけ点を消す（普通の項目と混ざったリストでも、普通の項目の点は残す）
  "[&_li>p]:my-0.5 [&_.task-list-item]:-ml-5 [&_.task-list-item]:list-none [&_.task-list-item_input]:mr-1.5",
  "[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
  "[&_:not(pre)>code]:rounded [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:text-xs"
);

// 本文の見出しは、ページの h1〜h3 の下に来るよう1段下げて描く（# は h4、## は h5、それ以下は h6）
const markdownComponents: Components = {
  h1: ({ node, className, ...props }) => (
    <h4 {...props} className={cn("mt-5 mb-2 text-xl font-semibold first:mt-0", className)} />
  ),
  h2: ({ node, className, ...props }) => (
    <h5 {...props} className={cn("mt-4 mb-2 text-lg font-semibold first:mt-0", className)} />
  ),
  h3: ({ node, className, ...props }) => (
    <h6 {...props} className={cn("mt-3 mb-1.5 text-base font-semibold first:mt-0", className)} />
  ),
  h4: ({ node, className, ...props }) => (
    <h6 {...props} className={cn("mt-3 mb-1 text-sm font-semibold first:mt-0", className)} />
  ),
  h5: ({ node, className, ...props }) => (
    <h6 {...props} className={cn("mt-3 mb-1 text-sm font-semibold first:mt-0", className)} />
  ),
  h6: ({ node, className, ...props }) => (
    <h6 {...props} className={cn("mt-3 mb-1 text-sm font-medium first:mt-0", className)} />
  ),
  a: ({ node, className, ...props }) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("text-primary underline", className)}
    >
      {props.children}
    </a>
  ),
  // Markdown のチェックリストの欄にも名前を付ける
  input: ({ node, ...props }) => (
    <input
      {...props}
      aria-label={props.type === "checkbox" ? (props.checked ? "完了" : "未完了") : props["aria-label"]}
    />
  ),
  // 広い表は、本文の中だけで横にスクロールする。キーボードでもスクロールできるようフォーカスを受ける
  table: ({ node, className, ...props }) => (
    <div
      role="region"
      aria-label="表（横にスクロールできます）"
      tabIndex={0}
      className="my-2 max-w-full overflow-x-auto rounded outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <table
        {...props}
        className={cn(
          "w-max border-collapse text-xs [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_td]:align-top [&_th]:border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:whitespace-nowrap",
          className
        )}
      />
    </div>
  ),
  pre: ({ node, className, ...props }) => (
    <pre
      {...props}
      className={cn("my-2 max-w-full rounded-md bg-muted p-3 text-xs break-words whitespace-pre-wrap", className)}
    />
  ),
};

// プロジェクト画面の「Wiki」。左にページの一覧と書き方の早見、右に本文か、追加・編集のフォームを出す
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
  const { displayWorkspaceId } = useDisplayWorkspaceIdContext();
  const { pageUpdated, setPageUpdated } = usePageUpdateContext();
  const { setNotificationValue } = useNotificationContext();

  const fieldId = useId();
  const addButtonId = `${fieldId}-add`;
  const editButtonId = `${fieldId}-edit`;
  const formId = `${fieldId}-form`;
  const previousSmallProjectId = useRef<number | null>(null);
  const returnFocusTo = useRef<string | null>(null);
  const pageCountBeforeDelete = useRef<number | null>(null);

  const isFormOpen = addFormOpen || editFormOpen;
  const currentPage: WikiDataProps | undefined = wikiData[displayWikiNumber];

  useEffect(() => {
    const changedDisplaySmallProjectId =
      displaySmallProjectId &&
      smallProjectIdList.includes(displaySmallProjectId)
        ? displaySmallProjectId
        : smallProjectIdList[0];

    setUseDisplaySmallProjectId(changedDisplaySmallProjectId);

    // 小プロジェクトを切り替えたら先頭のページを出す（番号を持ち越すと、ページの少ない小プロジェクトで無いページを読む）
    const switched =
      previousSmallProjectId.current !== null &&
      previousSmallProjectId.current !== changedDisplaySmallProjectId;
    previousSmallProjectId.current = changedDisplaySmallProjectId;

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

      if (switched) {
        setDisplayWikiNumber(0);
        setUpdateFlg(false);
      } else if (updateFlg && findWikiData && findWikiData.length > wikiData.length) {
        setDisplayWikiNumber(findWikiData?.length - 1);
        setUpdateFlg(!updateFlg);
      } else if (findWikiData && displayWikiNumber >= findWikiData.length) {
        // 定期の読み直しで、ほかの人の削除により一覧が縮んだとき
        setDisplayWikiNumber(0);
      }
    }
  }, [pageUpdated, displaySmallProjectId]);

  // フォームを閉じたら、開いたボタンへフォーカスを戻す（閉じると、押した「キャンセル」などが消えてフォーカスが body へ落ちる）。
  // 追加のあとは通知の処理を待つ間ボタンが押せないので、待ち終えてから戻す
  useEffect(() => {
    if (isFormOpen || postLoading || !returnFocusTo.current) return;
    document.getElementById(returnFocusTo.current)?.focus();
    returnFocusTo.current = null;
  }, [isFormOpen, postLoading]);

  // 削除のあと、読み直しで「削除」が押せなくなる（最後のページだった）などでフォーカスを失ったら、「追加」へ移す。
  // Radix のダイアログが閉じたあとフォーカスを戻す処理（setTimeout）より後に確かめる
  useEffect(() => {
    const countBefore = pageCountBeforeDelete.current;
    if (deleteModalOpen || countBefore === null) return;
    const shrunk = wikiData.length < countBefore;
    const timer = setTimeout(() => {
      const active = document.activeElement;
      if (!active || active === document.body || active.matches(":disabled")) {
        document.getElementById(addButtonId)?.focus();
      }
      if (shrunk) pageCountBeforeDelete.current = null;
    }, 0);
    return () => clearTimeout(timer);
  }, [deleteModalOpen, wikiData]);

  const handleClickWikiPage = (index: number) => {
    if (editFormOpen) {
      return;
    }
    setDisplayWikiNumber(index);
  };

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
    returnFocusTo.current = addButtonId;
    setAddFormOpen(!addFormOpen);
  };

  const onEditFormOpen = (displayWikiNumber: number) => {
    if (wikiData.length === 0 || addFormOpen) {
      return;
    }
    returnFocusTo.current = editButtonId;
    // もう一度押して閉じるときは、入力を捨てる（残すと、次の「追加」のフォームに編集中の文が出る）
    if (editFormOpen) {
      onClose();
      return;
    }
    setEnteredWikiData({
      id: wikiData[displayWikiNumber].id,
      title: wikiData[displayWikiNumber].title,
      content: wikiData[displayWikiNumber].content,
    });
    setEditFormOpen(true);
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
        message: "Wiki のページを削除しました。",
        color: 0,
      });
    } catch (error) {
      console.error("Delete Wiki Data", error);
      // 消えなかったので、フォーカスを移す予定を取り消す
      pageCountBeforeDelete.current = null;
      setNotificationValue({
        message: "Wiki のページを削除できませんでした。",
        color: 1,
      });
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
            displayWorkspaceId,
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
        message: "Wiki のページを追加しました。",
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
          ? "Wiki のページを追加できませんでした。"
          : "Wiki のページを更新できませんでした。",
        color: 1,
      });
    }
    setPostLoading(false);
    onClose();
    setPageUpdated(true);
  };

  const heading = addFormOpen
    ? "ページを追加"
    : editFormOpen
      ? "ページを編集"
      : (currentPage?.title ?? "Wiki");

  return (
    <>
      {deleteModalOpen && (
        <ConfirmDialog
          title="この Wiki のページを削除しますか？"
          description="元に戻せません。"
          confirmLabel="削除する"
          pendingLabel="削除中"
          destructive
          onConfirm={() => {
            pageCountBeforeDelete.current = wikiData.length;
            return handleDeleteWikiPage();
          }}
          onCancel={closeModal}
        />
      )}
      <div className="grid grid-cols-[16rem_minmax(0,1fr)] items-start gap-4">
        <div className="space-y-4">
          <section
            aria-labelledby={`${fieldId}-pages`}
            className="overflow-hidden rounded-xl border bg-card text-sm text-card-foreground shadow-xs"
          >
            <h3
              id={`${fieldId}-pages`}
              className="m-0 flex items-center gap-2 border-b px-4 py-2.5 text-sm font-semibold"
            >
              ページ
              <span className="rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground">
                {wikiData.length}
              </span>
            </h3>
            {wikiData.length === 0 ? (
              <p className="m-0 px-4 py-3 text-xs text-muted-foreground">ページはありません</p>
            ) : (
              <ul className="m-0 max-h-72 list-none space-y-0.5 overflow-y-auto p-1.5">
                {wikiData.map((wiki, index) => (
                  <li key={wiki.id}>
                    <button
                      type="button"
                      aria-current={index === displayWikiNumber ? "page" : undefined}
                      disabled={editFormOpen}
                      onClick={() => handleClickWikiPage(index)}
                      className={cn(
                        "w-full rounded-md px-2.5 py-1.5 text-left break-words outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
                        index === displayWikiNumber && "bg-primary/10 font-medium text-primary hover:bg-primary/10"
                      )}
                    >
                      {wiki.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Collapsible className="overflow-hidden rounded-xl border bg-card text-sm text-card-foreground shadow-xs">
            <CollapsibleTrigger className="group flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              Markdown の書き方
              <ChevronDown
                className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
                aria-hidden
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              {/* 中をスクロールするので、キーボードでも動かせるようフォーカスを受ける */}
              <div
                role="region"
                aria-label="Markdown の記法の一覧"
                tabIndex={0}
                className="max-h-96 overflow-y-auto border-t px-4 py-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
              >
                <dl className="m-0 space-y-3">
                  {MARKDOWN_GUIDE.map(({ label, code }) => (
                    <div key={label}>
                      <dt className="mb-1 text-xs font-medium text-muted-foreground">{label}</dt>
                      <dd className="m-0">
                        <pre className="m-0 rounded-md bg-muted p-2 text-xs break-words whitespace-pre-wrap">
                          <code>{code}</code>
                        </pre>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <section
          aria-labelledby={`${fieldId}-title`}
          className="min-w-0 overflow-hidden rounded-xl border bg-card text-sm text-card-foreground shadow-xs"
        >
          <header className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
            <h3 id={`${fieldId}-title`} className="m-0 min-w-0 flex-1 text-base font-semibold break-words">
              {heading}
            </h3>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                id={addButtonId}
                variant="outline"
                size="sm"
                aria-label="ページを追加"
                aria-expanded={addFormOpen}
                aria-controls={addFormOpen ? formId : undefined}
                disabled={editFormOpen || postLoading}
                onClick={onAddFormOpen}
              >
                <Plus className="size-4" aria-hidden />
                追加
              </Button>
              <Button
                id={editButtonId}
                variant="outline"
                size="sm"
                aria-label={currentPage ? `「${currentPage.title}」を編集` : "ページを編集"}
                aria-expanded={editFormOpen}
                aria-controls={editFormOpen ? formId : undefined}
                disabled={wikiData.length === 0 || addFormOpen || postLoading}
                onClick={() => onEditFormOpen(displayWikiNumber)}
              >
                <Pencil className="size-4" aria-hidden />
                編集
              </Button>
              <Button
                variant="outline"
                size="sm"
                aria-label={currentPage ? `「${currentPage.title}」を削除` : "ページを削除"}
                disabled={wikiData.length === 0 || isFormOpen}
                onClick={openModal}
                className="hover:text-destructive"
              >
                <Trash2 className="size-4" aria-hidden />
                削除
              </Button>
            </div>
          </header>

          {isFormOpen ? (
            <form id={formId} onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
              <div className="space-y-1.5">
                <Label htmlFor={`${fieldId}-input-title`}>タイトル</Label>
                <Input
                  id={`${fieldId}-input-title`}
                  autoFocus
                  value={enteredWikiData.title}
                  onChange={(e) =>
                    setEnteredWikiData({
                      id: enteredWikiData.id,
                      title: e.target.value,
                      content: enteredWikiData.content,
                    })
                  }
                  // タイトルの Enter では送らない（以前と同じ）
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault();
                  }}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${fieldId}-input-content`}>本文（Markdown）</Label>
                <Textarea
                  id={`${fieldId}-input-content`}
                  value={enteredWikiData.content}
                  onChange={(e) =>
                    setEnteredWikiData({
                      id: enteredWikiData.id,
                      title: enteredWikiData.title,
                      content: e.target.value,
                    })
                  }
                  className="min-h-80 font-mono"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" disabled={postLoading} onClick={onClose}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={postLoading}>
                  {postLoading && <Loader2 className="size-4 animate-spin" aria-hidden />}
                  {addFormOpen ? "追加する" : "更新する"}
                </Button>
              </div>
            </form>
          ) : currentPage ? (
            <div className={cn("px-5 py-4", MARKDOWN_CLASSES)}>
              <ReactMarkdown
                rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {currentPage.content}
              </ReactMarkdown>
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="Wiki のページはありません"
              description="「追加」から、この小プロジェクトの資料を Markdown で書けます。"
            />
          )}
        </section>
      </div>
    </>
  );
};

export default Wiki;
