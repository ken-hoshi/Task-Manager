import React, { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
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

// AI チャットの中身。RobotButton が開く Sheet の中に置く
const AiChatArea: React.FC = () => {
  const { setNotificationValue } = useNotificationContext();

  const [inputMessage, setInputMessage] = useState<string>("");
  const [displayMessages, setDisplayMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const userMessageRef = useRef<HTMLDivElement | null>(null);

  const sendMessage = async (message: string) => {
    try {
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
        throw new Error("APIエラー");
      }

      const data = await response.json();
      return data.content;
    } catch (error) {
      console.error("エラー:", error);
    }
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

      setTimeout(() => {
        userMessageRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    } catch (error) {
      setNotificationValue({
        message: "AI の答えを受け取れませんでした。",
        color: 1,
      });
    } finally {
      setInputMessage("");
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SheetHeader className="border-b pr-12">
        <SheetTitle>AI に質問</SheetTitle>
        <SheetDescription>質問は保存されず、前のやり取りも覚えていません。</SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
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
                  <div className="space-y-2 [&_ol]:my-1 [&_ol]:pl-5 [&_p]:my-0 [&_ul]:my-1 [&_ul]:pl-5">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // 表とコードは、吹き出しの幅を超えるぶんを横にスクロールさせる
                        table: ({ node, ...props }) => (
                          <div className="max-w-full overflow-x-auto">
                            <table
                              {...props}
                              className="border-collapse text-xs [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:bg-background [&_th]:px-2 [&_th]:py-1"
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
                      }}
                    >
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
