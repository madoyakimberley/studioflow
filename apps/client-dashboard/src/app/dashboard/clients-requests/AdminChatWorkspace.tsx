// app/dashboard/clients-requests/AdminChatWorkspace.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  AlertCircle,
  Send,
  Loader2,
  Check,
  CheckCheck,
} from "lucide-react";
import {
  fetchLiveChatUpdates,
  sendPortalMessage,
  setTypingStatus,
} from "../../portal-actions";
import { updateRequestStatusAction } from "./action";

type ProjectData = {
  id: number;
  name: string;
  client: any;
  requests: any[];
};

export default function AdminChatWorkspace({
  projectsData,
}: {
  projectsData: ProjectData[];
}) {
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [clientIsTyping, setClientIsTyping] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const activeProject = projectsData.find((p) => p.id === activeProjectId);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, clientIsTyping]);

  // Real-time Polling for the ACTIVE project
  useEffect(() => {
    if (!activeProjectId) return;

    const loadInitial = async () => {
      const updates = await fetchLiveChatUpdates(activeProjectId, "admin");
      if (updates.messages) setMessages(updates.messages);
      setClientIsTyping(!!updates.isOtherPartyTyping);
    };
    loadInitial();

    const interval = setInterval(async () => {
      try {
        const updates = await fetchLiveChatUpdates(activeProjectId, "admin");
        if (updates.messages) setMessages(updates.messages);
        setClientIsTyping(!!updates.isOtherPartyTyping);
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeProjectId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isPending || !inputValue.trim() || !activeProjectId) return;

    const newMsgContent = inputValue.trim();
    setIsPending(true); // Lock the button to show loading and make text gray

    // Send to database
    await sendPortalMessage(activeProjectId, "admin", newMsgContent);

    // Update UI after sending
    const sentMessage = {
      id: Date.now(),
      content: newMsgContent,
      sender: "admin",
      isRead: false,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, sentMessage]);

    // Only clear input if the user hasn't changed it while sending
    if (inputValue.trim() === newMsgContent) {
      setInputValue("");
    }

    // Unlock button and restore text color
    setIsPending(false);
  };

  return (
    <div className="flex-1 flex bg-[#0b1326] border border-[#171f33] rounded-2xl overflow-hidden shadow-2xl min-h-0">
      {/* LEFT PANEL: Project / Client List */}
      <div className="w-1/3 border-r border-[#171f33] flex flex-col bg-[#06070b]/50">
        <div className="p-4 border-b border-[#171f33] bg-[#0b1326]">
          <h2 className="text-xs font-bold tracking-wider uppercase text-slate-400">
            Active Channels
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {projectsData.map((project) => (
            <button
              key={project.id}
              onClick={() => setActiveProjectId(project.id)}
              className={`w-full text-left p-4 border-b border-[#171f33]/50 hover:bg-[#131b2e] transition-colors flex items-start gap-3 ${
                activeProjectId === project.id
                  ? "bg-[#131b2e] border-l-2 border-l-[#e364a7]"
                  : ""
              }`}
            >
              <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-tr from-[#9d4edd] to-[#e364a7] p-[2px]">
                <div className="w-full h-full bg-[#06070b] rounded-full flex items-center justify-center text-xs font-bold text-white">
                  {project.client?.name?.substring(0, 2).toUpperCase() || "CL"}
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-sm font-bold text-white truncate">
                    {project.name}
                  </h3>
                  {project.requests.filter((r) => r.status === "pending")
                    .length > 0 && (
                    <span className="bg-amber-500 text-[#06070b] text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      {
                        project.requests.filter((r) => r.status === "pending")
                          .length
                      }{" "}
                      New
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate">
                  {project.client?.email || "No email linked"}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL: Active Chat & Requests */}
      <div className="flex-1 flex flex-col bg-[#0b1326]">
        {!activeProject ? (
          <div className="flex-1 flex items-center justify-center text-sm text-slate-500 font-mono">
            Select a channel to open the matrix.
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b border-[#171f33] bg-[#0b1326] flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-white font-serif">
                  {activeProject.name}
                </h2>
                <p className="text-xs text-slate-400">
                  Client: {activeProject.client?.name}
                </p>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Chat Area */}
              <div className="flex-1 flex flex-col border-r border-[#171f33]">
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-6 space-y-4"
                >
                  {messages.length === 0 ? (
                    <div className="text-center text-xs text-slate-500 my-10">
                      No messages yet.
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isAdmin = msg.sender === "admin";
                      const timeString = msg.createdAt
                        ? new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "";

                      return (
                        <div
                          key={msg.id}
                          className={`max-w-[80%] p-3 shadow-md ${isAdmin ? "self-end bg-[#1c2438] text-white rounded-2xl rounded-tr-sm ml-auto" : "self-start bg-[#131b2e] text-[#dae2fd] rounded-2xl rounded-tl-sm mr-auto"}`}
                        >
                          <p className="text-sm leading-relaxed mb-1">
                            {msg.content}
                          </p>
                          <div
                            className={`flex items-center gap-1 text-[10px] ${isAdmin ? "justify-end text-[#9d4edd]" : "justify-start text-[#7a849c]"}`}
                          >
                            <span>{timeString}</span>
                            {isAdmin &&
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
                  {clientIsTyping && (
                    <div className="self-start bg-[#131b2e] px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1.5 w-fit">
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

                {/* Message Input */}
                <div className="p-4 bg-[#06070b] border-t border-[#171f33]">
                  <form onSubmit={handleSendMessage} className="flex gap-3">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => {
                        setInputValue(e.target.value);
                        setTypingStatus(activeProject.id, "admin", true);
                        setTimeout(
                          () =>
                            setTypingStatus(activeProject.id, "admin", false),
                          2000,
                        );
                      }}
                      placeholder="Type a direct response..."
                      className={`flex-1 bg-[#131b2e] border border-[#212d4a] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-colors ${
                        isPending ? "text-slate-500" : "text-white"
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={!inputValue.trim() || isPending}
                      className="bg-gradient-to-r from-[#e364a7] to-[#9d4edd] p-3 rounded-xl text-white hover:brightness-110 disabled:opacity-50 disabled:grayscale transition-all min-w-[48px] flex justify-center items-center cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Context Area: Active Requests */}
              <div className="w-1/3 bg-[#080b14] p-4 overflow-y-auto space-y-4">
                <h3 className="text-xs font-bold tracking-wider uppercase text-slate-400 flex items-center gap-2 mb-4">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Channel
                  Requests
                </h3>
                {activeProject.requests.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    No active requests.
                  </p>
                ) : (
                  activeProject.requests.map((req) => (
                    <div
                      key={req.id}
                      className="bg-[#131b2e] border border-[#212d4a] p-3 rounded-xl space-y-2"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-sm font-bold text-white">
                          {req.title}
                        </h4>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 uppercase">
                          {req.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {req.description}
                      </p>

                      <form
                        action={updateRequestStatusAction}
                        className="pt-2 mt-2 border-t border-[#1e2942] flex gap-2"
                      >
                        <input type="hidden" name="requestId" value={req.id} />
                        <select
                          name="status"
                          defaultValue={req.status}
                          className="flex-1 bg-[#06070b] border border-[#171f33] text-[10px] text-slate-300 px-2 py-1.5 rounded-lg outline-none"
                        >
                          <option value="pending">Pending</option>
                          <option value="reviewing">In Review</option>
                          <option value="completed">Completed</option>
                        </select>
                        <button
                          type="submit"
                          className="bg-[#1e2942] hover:bg-slate-700 text-[10px] px-3 py-1.5 rounded-lg text-white transition"
                        >
                          Save
                        </button>
                      </form>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
