"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  sendPortalMessage,
  fetchLiveChatUpdates,
  setTypingStatus,
} from "../../../portal-actions";
import { Send, Loader2, Check, CheckCheck, Moon } from "lucide-react";
import toast from "react-hot-toast";

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

  // NEW: Smart Polling States
  const [isAsleep, setIsAsleep] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());

  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, adminIsTyping]);

  // Track User Activity to prevent empty polling
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
      if (isAsleep) setIsAsleep(false); // Wake up!
    };

    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("click", updateActivity);
    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("click", updateActivity);
    };
  }, [isAsleep]);

  // Real-time Smart Polling mechanism
  useEffect(() => {
    const interval = setInterval(async () => {
      // SLEEP MODE: If no activity for 5 minutes (300,000 ms), stop polling
      if (Date.now() - lastActivityRef.current > 300000) {
        setIsAsleep(true);
        return;
      }

      try {
        const updates = await fetchLiveChatUpdates(projectId, "client");
        if (updates.messages) {
          setMessages(updates.messages as any);
        }
        // FIX: Match the actual property returned by the Server Action
        if (updates.isOtherPartyTyping) {
          setAdminIsTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(
            () => setAdminIsTyping(false),
            2000,
          );
        }
      } catch (err) {
        console.error("Chat sync dropped");
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [projectId, isAsleep]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    lastActivityRef.current = Date.now(); // Keep awake while typing

    if (!isTyping) {
      setIsTyping(true);
      // FIX: Add the required third boolean argument 'isTyping: true'
      setTypingStatus(projectId, "client", true);
      setTimeout(() => {
        setIsTyping(false);
        // Bonus safety: Tell the server we stopped typing when the timeout hits
        setTypingStatus(projectId, "client", false);
      }, 2000);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isPending) return;

    const messageText = inputValue;
    setInputValue("");
    setIsPending(true);

    const res = await sendPortalMessage(projectId, messageText, "client");

    if (res.success) {
      // Force an immediate sync to show the message
      const updates = await fetchLiveChatUpdates(projectId, "client");
      if (updates.messages) setMessages(updates.messages as any);

      // Stop typing immediately upon sending
      setIsTyping(false);
      setTypingStatus(projectId, "client", false);

      // 🚨 FIX: If the server attached a warning message (like the rate limit warning), display it!
      if (res.message) {
        toast(res.message, { icon: "⚠️", duration: 5000 });
      }
    } else {
      // ENFORCE RATE LIMIT ERROR IN THE UI
      toast.error(res.error || "Failed to send message", { duration: 5000 });
      setInputValue(messageText); // Give them their text back so they don't lose it!
    }

    setIsPending(false);
  };

  return (
    <div className="flex flex-col h-[500px] bg-[#05070c] rounded-xl border border-[#171f33] overflow-hidden shadow-2xl relative">
      {/* Sleep Mode Overlay */}
      {isAsleep && (
        <div className="absolute inset-0 z-10 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-slate-400">
          <Moon className="w-8 h-8 mb-3 opacity-50 animate-pulse" />
          <p className="text-sm font-semibold text-white">
            Chat paused to save resources.
          </p>
          <p className="text-xs opacity-60 mt-1">
            Move your mouse to reconnect to live stream.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#0b1326] px-4 py-3 border-b border-[#171f33] flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-sm font-semibold text-white">
            Live Operations Chat
          </h3>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold bg-[#131b2e] px-2 py-1 rounded">
          Encrypted Channel
        </span>
      </div>

      {/* Chat Area */}
      <div
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-[#212d4a] scrollbar-track-transparent"
      >
        {messages.map((msg, index) => {
          const isClient = msg.sender === "client";
          return (
            <div
              key={msg.id || index}
              className={`flex flex-col ${isClient ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                  isClient
                    ? "bg-[#1f2937] text-white rounded-tr-sm border border-[#374151]"
                    : "bg-gradient-to-br from-[#9d4edd] to-[#e364a7] text-white rounded-tl-sm shadow-[0_0_15px_rgba(227,100,167,0.15)]"
                }`}
              >
                <p className="leading-relaxed">{msg.content}</p>
              </div>
              <div className="flex items-center gap-1 mt-1 px-1">
                <span className="text-[10px] text-slate-500 font-medium">
                  {isClient ? "You" : "Admin"}
                </span>
                {isClient && msg.isRead && (
                  <CheckCheck className="w-3 h-3 text-emerald-500" />
                )}
                {isClient && !msg.isRead && (
                  <Check className="w-3 h-3 text-slate-600" />
                )}
              </div>
            </div>
          );
        })}

        {adminIsTyping && (
          <div className="flex items-center gap-1.5 p-3 w-fit bg-[#0b1326] rounded-2xl rounded-tl-sm border border-[#171f33]">
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

      {/* Input Form */}
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
              <Loader2 className="w-4 h-4 animate-spin text-white/70" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
