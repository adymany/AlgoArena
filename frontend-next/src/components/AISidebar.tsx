"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { getApiBase, fetchJSON } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string | Date; // Allow ISO string from DB
}

interface AISidebarProps {
  code: string;
  language: string;
  userId: number | null;
  problemId: string;
}

import AISidebarSkeleton from "./AISidebarSkeleton";

export default function AISidebar({
  code,
  language,
  userId,
  problemId,
}: AISidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [width, setWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history
  useEffect(() => {
    if (!userId) {
      setIsHistoryLoading(false);
      return;
    }
    if (!problemId) return;

    setIsHistoryLoading(true);
    fetchJSON<Message[]>(`${getApiBase()}/api/v1/chat/${problemId}?user_id=${userId}`)
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setMessages(data);
        } else {
          // Default valid message if no history
          setMessages([
            {
              role: "assistant",
              content:
                "Hello! I'm AlgoBot, your AI coding assistant. I can help you with:\n\n* Explaining algorithms\n* Debugging your code\n* Optimizing solutions\n\nAsk me anything!",
              timestamp: new Date(),
            },
          ]);
        }
      })
      .finally(() => setIsHistoryLoading(false));
  }, [userId, problemId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isHistoryLoading]);

  // Save chat to DB
  const saveChatToDB = useCallback(
    (newHistory: Message[]) => {
      fetch(`${getApiBase()}/api/v1/chat/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          problem_id: problemId,
          history: newHistory,
        }),
      }).catch((err) => console.error("Failed to save chat", err));
    },
    [userId, problemId],
  );

  // Resize handlers
  const handleMouseDown = useCallback(() => {
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      // Calculate new width based on window width - mouse X position
      const newWidth = window.innerWidth - e.clientX;
      const constrainedWidth = Math.max(280, Math.min(newWidth, 600)); // Min 280px, Max 600px
      setWidth(constrainedWidth);
    },
    [isResizing],
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

      if (!apiKey) {
        throw new Error("API key not configured");
      }

      const systemContext = `You are AlgoBot, an AI coding assistant for the AlgoArena competitive programming platform. 
The user is working on problem: ${problemId}.
Current language: ${language}
Current code:
\`\`\`${language}
${code}
\`\`\`

Be concise and helpful. Use Markdown for code blocks and formatting.`;

      const response = await fetch(
        `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash-lite:streamGenerateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: systemContext + "\n\nUser question: " + input },
                ],
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      let assistantContent = "";
      if (Array.isArray(data)) {
        for (const chunk of data) {
          if (chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
            assistantContent += chunk.candidates[0].content.parts[0].text;
          }
        }
      } else if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        assistantContent = data.candidates[0].content.parts[0].text;
      }

      if (!assistantContent) {
        assistantContent = "I couldn't generate a response. Please try again.";
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: assistantContent,
        timestamp: new Date(),
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      saveChatToDB(finalMessages);
    } catch (error) {
      const errorMessage: Message = {
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : "Failed to get response"}. Please check your API key in .env.local`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateInput: string | Date) => {
    const date =
      typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isHistoryLoading) {
    return (
      <>
        <div
          className={`sidebar-resizer ${isResizing ? "active" : ""}`}
          onMouseDown={handleMouseDown}
        />
        <AISidebarSkeleton width={width} />
      </>
    );
  }

  return (
    <>
      <div
        className={`sidebar-resizer ${isResizing ? "active" : ""}`}
        onMouseDown={handleMouseDown}
      />
      <div className="ai-sidebar" style={{ width: width }}>
        <div className="ai-header">
          <div className="ai-header-left">
            <div className="ai-avatar-icon">AI</div>
            <div className="ai-header-text">
              <h2 className="ai-title">AlgoBot</h2>
              <span className="ai-subtitle">AI Assistant</span>
            </div>
          </div>
          <div className="ai-status">
            <span className="ai-status-dot"></span>
            <span>Online</span>
          </div>
        </div>

        <div className="ai-messages">
          {!userId ? (
            <div className="ai-message assistant">
              <div className="ai-message-avatar">
                <span style={{ fontSize: "0.65rem", fontWeight: 700 }}>AI</span>
              </div>
              <div className="ai-message-content">
                <div className="ai-message-bubble">
                  Please{" "}
                  <a
                    href="/login"
                    style={{ color: "#a855f7", textDecoration: "underline" }}
                  >
                    login
                  </a>{" "}
                  to use AlgoBot AI assistance.
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div key={idx} className={`ai-message ${msg.role}`}>
                  <div className="ai-message-avatar">
                    {msg.role === "assistant" ? "AI" : "U"}
                  </div>
                  <div className="ai-message-content">
                    <div className="ai-message-bubble">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                    <span className="ai-message-time">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="ai-message assistant">
                  <div className="ai-message-avatar">
                    <span style={{ fontSize: "0.65rem", fontWeight: 700 }}>
                      AI
                    </span>
                  </div>
                  <div className="ai-message-content">
                    <div className="ai-typing">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="ai-input-container">
          <input
            type="text"
            className="ai-input"
            placeholder={userId ? "Ask AlgoBot..." : "Login to chat"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading || !userId}
          />
          <button
            className="ai-send-btn"
            onClick={sendMessage}
            disabled={isLoading || !input.trim() || !userId}
          >
            <svg className="ai-send-icon" viewBox="0 0 24 24">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
