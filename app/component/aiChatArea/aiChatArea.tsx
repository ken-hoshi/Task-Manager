import React, { useState, Dispatch, SetStateAction, useRef } from "react";
import ReactMarkdown from "react-markdown";
import styles from "./aiChatArea.module.css";
import classNames from "classnames";
import Image from "next/image";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { sendGeminiMessage } from "@/app/api/sendGeminiMessage";

interface ChatMessage {
  user: string;
  content: string;
}

interface AiChatAreaProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

const AiChatArea: React.FC<AiChatAreaProps> = ({ setIsOpen }) => {
  const { setNotificationValue } = useNotificationContext();

  const [inputMessage, setInputMessage] = useState<string>("");
  const [displayMessages, setDisplayMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const userMessageRef = useRef<HTMLDivElement | null>(null);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await sendGeminiMessage(inputMessage);

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
        message: " Couldn't get Response Data",
        color: 1,
      });
    } finally {
      setInputMessage("");
      setLoading(false);
    }
  };

  const renderChatMessage = (message: ChatMessage) => {
    const isUserMessage = message.user === "user";

    return (
      <div ref={isUserMessage ? userMessageRef : null}>
        {isUserMessage ? (
          <div>
            {message.content.split("\n").map((line, index) => (
              <React.Fragment key={index}>
                {line}
                <br />
              </React.Fragment>
            ))}
          </div>
        ) : (
          <ReactMarkdown >
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    );
  };


  return (
    <div className={styles[`chat-area`]}>
      <div className={styles[`cancel-button-container`]}>
        <span
          className={classNames("material-symbols-outlined", styles.cancel)}
          onClick={() => setIsOpen(false)}
        >
          close
        </span>
      </div>

      <div className={styles[`content-area`]}>
        <h1>Ask AI Chat</h1>
        <div className={styles.attention}>
          ※プロンプトは記憶されないのでご注意ください
        </div>
        <div className={styles[`message-area-container`]}>
          <div className={styles[`background-container`]}>
            <Image
              src="/img/background-image1.jpeg"
              alt="background-image1"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className={styles[`background-image1`]}
              priority={true}
            />
          </div>
          <div className={styles[`message-area`]}>
            {displayMessages.map((message, index) => (
              <div className={styles[`message-container`]} key={index}>
                {message.user === "ai" && (
                  <div className={styles[`robot-img-container`]}>
                    <Image
                      src="/img/robot.png"
                      alt="robot"
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className={styles[`robot-img`]}
                    />
                  </div>
                )}

                <div
                  className={
                    message.user === "user"
                      ? styles[`user-message`]
                      : styles[`ai-message`]
                  }
                >
                  {renderChatMessage(message)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles[`form-area`]}>
          <form onSubmit={handleSendMessage}>
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask me anything..."
              required
            />
            <button type="submit">
              {loading ? (
                <div className={styles[`button-spinner`]}></div>
              ) : (
                "Send"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AiChatArea;
