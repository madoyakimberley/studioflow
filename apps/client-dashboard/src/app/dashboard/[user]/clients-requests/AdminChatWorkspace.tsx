"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  AlertCircle,
  Send,
  Loader2,
  Check,
  CheckCheck,
  ChevronRight,
  Terminal,
  RefreshCcw,
} from "lucide-react";
import {
  fetchLiveChatUpdates,
  sendPortalMessage,
  setTypingStatus,
} from "../../../portal-actions";
// FIX: Corrected import to match actions.ts
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

  // NEW: State to track which specific request is currently saving
  const [savingReqs, setSavingReqs] = useState<Record<number, boolean>>({});

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
    setIsPending(true);

    await sendPortalMessage(activeProjectId, newMsgContent, "admin");

    const sentMessage = {
      id: Date.now(),
      content: newMsgContent,
      sender: "admin",
      isRead: false,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, sentMessage]);

    if (inputValue.trim() === newMsgContent) {
      setInputValue("");
    }
    setIsPending(false);
  };

  // NEW: Handler for status updates to show loading spinners
  const handleStatusUpdate = async (
    e: React.FormEvent<HTMLFormElement>,
    reqId: number,
  ) => {
    e.preventDefault();
    setSavingReqs((prev) => ({ ...prev, [reqId]: true }));

    const formData = new FormData(e.currentTarget);
    await updateRequestStatusAction(formData);

    setSavingReqs((prev) => ({ ...prev, [reqId]: false }));
  };

  return (
    <div className="flex-1 flex gap-8 h-full min-h-0 font-['Plus_Jakarta_Sans',_sans-serif]">
      {/* LEFT PANEL: Project / Client List (Glassmorphism) */}
      <div className="w-80 shrink-0 bg-[var(--border-outline)]/45 backdrop-blur-[24px] border border-[rgba(175,186,255,0.15)] rounded-xl flex flex-col overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-[rgba(175,186,255,0.15)] bg-[var(--bg-surface)]/20">
          <h4 className="text-[12px] font-bold tracking-[0.1em] uppercase text-[var(--text-muted)] mb-4">
            Active Channels
          </h4>
          <div className="flex gap-2">
            <span className="px-2 py-1 bg-[var(--color-theme-primary)]/10 border border-[var(--color-theme-primary)]/20 text-[var(--color-theme-primary)] text-[10px] font-bold rounded uppercase tracking-wider">
              LIVE: {projectsData.length}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {projectsData.map((project) => {
            const hasPending = project.requests.some(
              (r) => r.status === "pending",
            );

            return (
              <button
                key={project.id}
                onClick={() => setActiveProjectId(project.id)}
                className={`w-full flex items-center gap-3 p-4 rounded-lg transition-all text-left group ${
                  activeProjectId === project.id
                    ? "bg-[var(--color-theme-primary)]/10 border border-[var(--color-theme-primary)]/20 translate-x-1"
                    : "border border-transparent hover:bg-[var(--border-outline)]/30"
                }`}
              >
                {/* Luminous Node Dot */}
                <div
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    hasPending
                      ? "bg-[var(--color-danger)] shadow-[0_0_8px_var(--color-danger)]"
                      : "bg-[var(--color-theme-primary)] shadow-[0_0_8px_var(--color-theme-primary)]"
                  }`}
                />

                <div className="flex-1 overflow-hidden">
                  <p
                    className={`text-[12px] font-bold tracking-[0.1em] uppercase transition-colors truncate ${
                      activeProjectId === project.id
                        ? "text-[var(--color-theme-primary)]"
                        : "text-[var(--text-main)] group-hover:text-[var(--color-theme-primary)]"
                    }`}
                  >
                    {project.name}
                  </p>
                  <p className="text-[12px] text-[var(--text-muted)]/60 truncate mt-0.5">
                    {project.client?.name || "Unknown Identity"}
                  </p>
                </div>

                <ChevronRight
                  className={`w-[18px] h-[18px] transition-colors ${
                    activeProjectId === project.id
                      ? "text-[var(--color-theme-primary)]"
                      : "text-[var(--text-muted)]/40"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANEL: Active Chat & Requests */}
      <div className="flex-1 bg-[var(--border-outline)]/45 backdrop-blur-[24px] border border-[rgba(175,186,255,0.15)] rounded-xl flex items-center justify-center relative overflow-hidden shadow-2xl">
        {/* Subtle dot grid background for the technical feel */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, var(--color-theme-primary) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />

        {!activeProject ? (
          /* EMPTY STATE: High Fidelity Awaiting Signal */
          <div className="relative z-10 text-center px-8 max-w-lg">
            <div className="relative w-48 h-48 mx-auto mb-8 flex items-center justify-center">
              <div className="absolute inset-0 border border-[var(--color-theme-primary)]/20 rounded-full animate-[ping_3s_linear_infinite]" />
              <div className="absolute inset-4 border border-[var(--color-theme-secondary)]/10 rounded-full animate-[ping_4s_linear_infinite_1s]" />
              <div className="w-32 h-32 rounded-full bg-[var(--border-outline)]/45 backdrop-blur-[24px] border border-[rgba(175,186,255,0.3)] flex items-center justify-center relative shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-theme-primary)] to-[var(--color-theme-secondary)] opacity-10 rounded-full blur-xl" />
                <Terminal className="w-16 h-16 text-[var(--color-theme-secondary)] stroke-[1]" />
              </div>
              <div className="absolute top-0 right-4 w-4 h-4 rounded-full bg-gradient-to-br from-[var(--color-theme-primary)] to-[var(--color-theme-secondary)] shadow-lg shadow-[var(--color-theme-primary)]/20 animate-bounce" />
              <div className="absolute bottom-4 left-0 w-3 h-3 rounded-full bg-[#f6d9ff] shadow-lg shadow-[var(--color-theme-secondary)]/20 animate-pulse" />
            </div>
            <h2 className="text-[32px] font-medium font-['Playfair_Display',_serif] text-[var(--text-main)] mb-4">
              Awaiting Signal...
            </h2>
            <p className="text-[18px] text-[var(--text-muted)] mb-8 font-light leading-[1.6]">
              Select a high-priority channel from the matrix directory on the
              left to initiate real-time node visualization and traffic
              analysis.
            </p>
          </div>
        ) : (
          /* ACTIVE STATE: Flex container for Chat & Sidebar */
          <div className="w-full h-full flex z-10">
            {/* Chat Area */}
            <div className="flex-1 flex flex-col border-r border-[rgba(175,186,255,0.15)]">
              {/* Header */}
              <div className="p-6 border-b border-[rgba(175,186,255,0.15)] bg-[var(--bg-surface)]/40 flex justify-between items-center">
                <div>
                  <h2 className="text-[24px] font-medium text-[var(--text-main)] font-['Playfair_Display',_serif]">
                    {activeProject.name}
                  </h2>
                  <p className="text-[12px] font-['JetBrains_Mono',_monospace] text-[var(--text-muted)]/70 mt-1">
                    CONNECTION_ESTABLISHED :: {activeProject.client?.email}
                  </p>
                </div>
              </div>

              {/* Chat Log */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-8 space-y-6"
              >
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <span className="font-['JetBrains_Mono',_monospace] text-[12px] text-[var(--text-muted)]/40 mb-2">
                      /logs/empty
                    </span>
                    <p className="text-[14px] text-[var(--text-muted)]/60 font-light">
                      Secure channel open. Awaiting first transmission.
                    </p>
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
                        className={`max-w-[75%] p-4 rounded-2xl ${
                          isAdmin
                            ? "self-end bg-[rgba(175,186,255,0.05)] border border-[rgba(175,186,255,0.2)] text-[var(--text-main)] rounded-tr-sm ml-auto"
                            : "self-start bg-[var(--bg-surface)]/60 border border-[rgba(175,186,255,0.05)] text-[var(--text-muted)] rounded-tl-sm mr-auto"
                        } shadow-lg`}
                      >
                        <p className="text-[15px] leading-[1.6] mb-2 font-light">
                          {msg.content}
                        </p>
                        <div
                          className={`flex items-center gap-1.5 font-['JetBrains_Mono',_monospace] text-[10px] ${
                            isAdmin
                              ? "justify-end text-[var(--color-theme-primary)]/80"
                              : "justify-start text-[var(--text-muted)]/50"
                          }`}
                        >
                          <span>{timeString}</span>
                          {isAdmin &&
                            (msg.isRead ? (
                              <CheckCheck className="w-[14px] h-[14px] text-[var(--color-theme-secondary)]" />
                            ) : (
                              <Check className="w-[14px] h-[14px]" />
                            ))}
                        </div>
                      </div>
                    );
                  })
                )}

                {clientIsTyping && (
                  <div className="self-start bg-[var(--bg-surface)]/60 border border-[rgba(175,186,255,0.05)] px-5 py-4 rounded-2xl rounded-tl-sm flex gap-2 w-fit">
                    <span
                      className="w-1.5 h-1.5 bg-[var(--color-theme-primary)] rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-[var(--color-theme-secondary)] rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-[var(--color-theme-secondary)] rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-6 bg-[var(--bg-surface)]/40 border-t border-[rgba(175,186,255,0.15)]">
                <form onSubmit={handleSendMessage} className="flex gap-4">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      setTypingStatus(activeProject.id, "admin", true);
                      setTimeout(
                        () => setTypingStatus(activeProject.id, "admin", false),
                        2000,
                      );
                    }}
                    placeholder="Execute command or send transmission..."
                    className="flex-1 bg-[rgba(27,33,49,0.45)] backdrop-blur-md border border-[rgba(175,186,255,0.2)] rounded-lg px-5 py-3.5 text-[14px] text-[var(--text-main)] font-light placeholder:text-[var(--text-muted)]/40 focus:outline-none focus:border-[var(--color-theme-primary)] focus:ring-1 focus:ring-[var(--color-theme-primary)] transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isPending}
                    className="bg-gradient-to-r from-[var(--color-theme-primary)] to-[var(--color-theme-secondary)] px-6 rounded-lg text-[#1f2b67] font-bold text-[12px] tracking-[0.1em] uppercase hover:opacity-90 disabled:opacity-50 disabled:grayscale transition-all flex justify-center items-center cursor-pointer disabled:cursor-not-allowed shadow-[0_0_15px_rgba(175,186,255,0.2)]"
                  >
                    {isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Context Area: Active Requests Sidebar */}
            <div className="w-1/3 bg-[#10131a]/40 p-6 overflow-y-auto border-l border-[rgba(175,186,255,0.1)]">
              <h3 className="text-[12px] font-bold tracking-[0.1em] uppercase text-[var(--text-muted)] flex items-center gap-2 mb-6">
                <AlertCircle className="w-[14px] h-[14px] text-[var(--color-danger)]" />
                Matrix Requests
              </h3>

              <div className="space-y-4">
                {activeProject.requests.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-[rgba(175,186,255,0.15)] text-center">
                    <p className="text-[12px] font-['JetBrains_Mono',_monospace] text-[var(--text-muted)]/50 uppercase tracking-widest">
                      No active queries
                    </p>
                  </div>
                ) : (
                  activeProject.requests.map((req) => (
                    <div
                      key={req.id}
                      className="bg-[rgba(27,33,49,0.3)] backdrop-blur-md border border-[rgba(175,186,255,0.15)] p-5 rounded-xl flex flex-col gap-3 transition-all hover:border-[rgba(175,186,255,0.3)]"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <h4 className="text-[14px] font-semibold text-[var(--text-main)] leading-tight">
                          {req.title}
                        </h4>
                        <span
                          className={`text-[9px] font-['JetBrains_Mono',_monospace] px-2 py-1 rounded shrink-0 uppercase tracking-widest font-bold ${
                            req.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : req.status === "reviewing"
                                ? "bg-[var(--color-theme-primary)]/10 text-[var(--color-theme-primary)] border border-[var(--color-theme-primary)]/20"
                                : "bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20"
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                      <p className="text-[13px] text-[var(--text-muted)]/80 font-light leading-relaxed line-clamp-2">
                        {req.description}
                      </p>

                      <form
                        onSubmit={(e) => handleStatusUpdate(e, req.id)}
                        className="pt-4 mt-1 border-t border-[rgba(175,186,255,0.1)] flex gap-2"
                      >
                        <input type="hidden" name="requestId" value={req.id} />
                        <select
                          name="status"
                          defaultValue={req.status}
                          className="flex-1 bg-[#10131a] border border-[rgba(175,186,255,0.2)] text-[12px] text-[var(--text-main)] px-3 py-2 rounded outline-none focus:border-[var(--color-theme-primary)] transition-colors appearance-none"
                        >
                          <option value="pending">Pending Signal</option>
                          <option value="reviewing">In Review</option>
                          <option value="completed">Execution Complete</option>
                        </select>
                        <button
                          type="submit"
                          disabled={savingReqs[req.id]}
                          className="bg-transparent border border-[rgba(175,186,255,0.3)] hover:bg-[rgba(175,186,255,0.1)] text-[var(--color-theme-primary)] disabled:opacity-50 text-[11px] font-bold uppercase tracking-widest px-4 py-2 rounded transition-all flex items-center justify-center min-w-[70px]"
                        >
                          {savingReqs[req.id] ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            "Commit"
                          )}
                        </button>
                      </form>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
