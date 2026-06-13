"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  sendPortalMessage,
  fetchLiveChatUpdates,
  setTypingStatus,
} from "../../../portal-actions";
import { Send, Loader2, Check, CheckCheck } from "lucide-react";

type Message = {
  id: number;
  content: string;
  sender: "client" | "admin";
  isRead?: boolean | null;
  createdAt?: Date;
};

export default function InteractiveChat({
  projectId,
  initialMessages,
}: {
  projectId: number;
  initialMessages: any[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [adminIsTyping, setAdminIsTyping] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, adminIsTyping]);

  // Real-time Polling mechanism (Checks every 3 seconds)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const updates = await fetchLiveChatUpdates(projectId, "client");
        if (updates.messages) {
          setMessages(updates.messages as Message[]);
        }
        setAdminIsTyping(!!updates.isOtherPartyTyping);
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [projectId]);

  // Handle Typing Indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);

    if (!isTyping) {
      setIsTyping(true);
      setTypingStatus(projectId, "client", true);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      setTypingStatus(projectId, "client", false);
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isPending) return;

    const newMsgContent = inputValue.trim();
    setIsPending(true);

    // Clear typing status immediately on send
    setIsTyping(false);
    setTypingStatus(projectId, "client", false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    const res = await sendPortalMessage(projectId, "client", newMsgContent);

    if (res.success) {
      const finalMessage: Message = {
        id: Date.now(),
        content: newMsgContent,
        sender: "client",
        isRead: false,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, finalMessage]);

      // Only clear input if the user hasn't changed it while sending
      if (inputValue.trim() === newMsgContent) {
        setInputValue("");
      }
    } else {
      alert("Failed to send message.");
    }

    setIsPending(false);
  };

  return (
    <>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-[#958ea0] text-sm">
            Start the conversation. This channel is directly linked to the
            StudioFlow team.
          </div>
        ) : (
          messages.map((msg) => {
            const isClient = msg.sender === "client";

            // Format timestamp if available
            const timeString = msg.createdAt
              ? new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "";

            return (
              <div
                key={msg.id}
                className={`max-w-[75%] p-4 shadow-md relative overflow-hidden ${
                  isClient
                    ? "self-end bg-[#1c2438] border border-[#4361ee]/30 text-white rounded-2xl rounded-tr-sm"
                    : "self-start bg-[#131b2e] border border-[#212d4a] text-[#dae2fd] rounded-2xl rounded-tl-sm"
                }`}
              >
                {isClient && (
                  <div className="absolute inset-0 bg-gradient-to-r from-[#4361ee]/10 to-[#9d4edd]/10 pointer-events-none" />
                )}
                <p className="relative z-10 text-sm leading-relaxed mb-1">
                  {msg.content}
                </p>

                {/* Timestamp and Read Receipts */}
                <div
                  className={`flex items-center gap-1 text-[10px] relative z-10 ${isClient ? "justify-end text-[#9d4edd]" : "justify-start text-[#7a849c]"}`}
                >
                  <span>{timeString}</span>
                  {isClient &&
                    (msg.isRead ? (
                      <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-[#7a849c]" />
                    ))}
                </div>
              </div>
            );
          })
        )}

        {/* Typing Indicator */}
        {adminIsTyping && (
          <div className="self-start bg-[#131b2e] border border-[#212d4a] px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5 w-fit">
            <span
              className="w-1.5 h-1.5 bg-[#e364a7] rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="w-1.5 h-1.5 bg-[#e364a7] rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="w-1.5 h-1.5 bg-[#e364a7] rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        )}
      </div>

      <div className="p-4 bg-[#0b1326] border-t border-[#171f33]">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className={`flex-1 bg-[#131b2e] border border-[#212d4a] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#9d4edd] transition-colors ${
              isPending ? "text-slate-500" : "text-white"
            }`}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isPending}
            className="bg-gradient-to-r from-[#e364a7] to-[#9d4edd] p-3 rounded-xl text-white hover:brightness-110 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center min-w-[48px]"
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </>
  );
}
