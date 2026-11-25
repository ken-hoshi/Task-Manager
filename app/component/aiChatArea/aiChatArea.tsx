import React, { useState, useRef } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { clientSupabase } from "@/app/lib/supabase/client";

interface ChatMessage {
  user: string;
  content: string;
}

// AI の答えの文字の決まり。Tailwind の土台は見出し・リスト・引用などの見た目を消すので、ここで付け直す
const AI_MARKDOWN_CLASSES = cn(
  "space-y-2 [&_p]:my-0",
  "[&_:is(h3,h4,h5)]:mb-1 [&_:is(h3,h4,h5)]:font-semibold [&_h3]:text-base [&_:is(h4,h5)]:text-sm",
  "[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5",
  // チェックリストの行だけ点を消す（wiki と同じ）
  "[&_.task-list-item]:-ml-5 [&_.task-list-item]:list-none [&_.task-list-item_input]:mr-1.5",
  "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_hr]:border-border",
  "[&_:not(pre)>code]:rounded [&_:not(pre)>code]:bg-background [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:text-xs"
);

// 答えの見出しは、パネルの題（h2）の下に来るよう h3 から描く（# と ## は h3、### は h4、それ以下は h5）
const aiMarkdownComponents: Components = {
  h1: ({ node, ...props }) => <h3 {...props} />,
  h2: ({ node, ...props }) => <h3 {...props} />,
  h3: ({ node, ...props }) => <h4 {...props} />,
  h4: ({ node, ...props }) => <h5 {...props} />,
  h5: ({ node, ...props }) => <h5 {...props} />,
  h6: ({ node, ...props }) => <h5 {...props} />,
  // チェックリストの欄にも名前を付ける（wiki と同じ）
  input: ({ node, ...props }) => (
    <input
      {...props}
      aria-label={props.type === "checkbox" ? (props.checked ? "完了" : "未完了") : props["aria-label"]}
    />
  ),
  // 表とコードは、吹き出しの幅を超えるぶんを横にスクロールさせる
  table: ({ node, ...props }) => (
    <div className="max-w-full overflow-x-auto">
      <table
        {...props}
        // 列を潰して1文字ずつ折り返さないよう、見出しは折り返さず、長いセルだけ 15rem で折り返す
        className="w-max border-collapse text-xs [&_td]:max-w-60 [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_td]:align-top [&_th]:border [&_th]:bg-background [&_th]:px-2 [&_th]:py-1 [&_th]:whitespace-nowrap"
      />
    </div>
  ),
  pre: ({ node, ...props }) => (
    <pre {...props} className="max-w-full overflow-x-auto rounded-md bg-background p-2 text-xs" />
  ),
  a: ({ node, ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary underline">
      {props.children}
    </a>
  ),
};

// AI チャットの中身。RobotButton が開く Sheet の中に置く
const AiChatArea: React.FC = () => {
  const { setNotificationValue } = useNotificationContext();

  const [inputMessage, setInputMessage] = useState<string>("");
  const [displayMessages, setDisplayMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const userMessageRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 失敗したら投げる（受け取る側で、吹き出しを足さずにエラーを知らせる）
  const sendMessage = async (message: string): Promise<string> => {
    const { data: sessionData } = await clientSupabase.auth.getSession();
    const response = await fetch("/api/sendGeminiMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionData.session?.access_token ?? ""}`,
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(`AI の問い合わせに失敗しました（${response.status}）`);
    }

    const data = await response.json();
    return data.content;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await sendMessage(inputMessage);

      setDisplayMessages([
        ...displayMessages,
        { user: "user", content: inputMessage },
        { user: "ai", content: response },
      ]);

      // 答えを受け取れたときだけ入力欄を空にする（失敗したら、質問を送り直せるよう残す）
      setInputMessage("");

      setTimeout(() => {
        userMessageRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    } catch (error) {
      console.error("Send AI Message", error);
      setNotificationValue({
        message: "AI の答えを受け取れませんでした。",
        color: 1,
      });
    } finally {
      setLoading(false);
      // 送っている間はボタンを押せなくするので、フォーカスが外れる。終わったら入力欄へ戻す
      setTimeout(() => inputRef.current?.focus());
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SheetHeader className="border-b pr-12">
        <SheetTitle>AI に質問</SheetTitle>
        <SheetDescription>質問は保存されず、前のやり取りも覚えていません。</SheetDescription>
      </SheetHeader>

      {/* role="log" で、届いた答えを読み上げる */}
      <div role="log" aria-label="AI とのやり取り" className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {displayMessages.length === 0 && (
          <p className="m-0 py-8 text-center text-sm text-muted-foreground">
            タスクの進め方や、文章の下書きなどを聞けます。
          </p>
        )}
        {displayMessages.map((message, index) => {
          const isUserMessage = message.user === "user";
          return (
            <div
              key={index}
              ref={isUserMessage ? userMessageRef : null}
              className={cn("flex items-start gap-2", isUserMessage && "justify-end")}
            >
              {!isUserMessage && (
                <div className="relative mt-0.5 size-7 shrink-0">
                  <Image src="/img/robot.png" alt="" fill sizes="28px" className="object-contain" />
                </div>
              )}
              {/* min-w-0 と折り返しで、長い文や URL も吹き出しの中に収める（決定21） */}
              <div
                className={cn(
                  "min-w-0 max-w-[85%] rounded-xl px-3 py-2 text-sm [overflow-wrap:anywhere]",
                  isUserMessage
                    ? "whitespace-pre-wrap bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {isUserMessage ? (
                  <span className="sr-only">あなた: </span>
                ) : (
                  <span className="sr-only">AI: </span>
                )}
                {isUserMessage ? (
                  message.content
                ) : (
                  <div className={AI_MARKDOWN_CLASSES}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={aiMarkdownComponents}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSendMessage} className="flex items-end gap-2 border-t p-4">
        <label htmlFor="ai-chat-input" className="sr-only">
          AI への質問
        </label>
        <Textarea
          ref={inputRef}
          id="ai-chat-input"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="質問を入力"
          required
          className="max-h-40"
        />
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {loading ? "送っています" : "送る"}
        </Button>
      </form>
    </div>
  );
};

export default AiChatArea;
