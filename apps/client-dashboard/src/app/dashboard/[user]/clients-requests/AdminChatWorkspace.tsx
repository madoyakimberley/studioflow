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

    await sendPortalMessage(activeProjectId, "admin", newMsgContent);

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
      <div className="w-80 shrink-0 bg-[#1b2131]/45 backdrop-blur-[24px] border border-[rgba(175,186,255,0.15)] rounded-xl flex flex-col overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-[rgba(175,186,255,0.15)] bg-[#1d2027]/20">
          <h4 className="text-[12px] font-bold tracking-[0.1em] uppercase text-[#c6c5d1] mb-4">
            Active Channels
          </h4>
          <div className="flex gap-2">
            <span className="px-2 py-1 bg-[#d3d7ff]/10 border border-[#d3d7ff]/20 text-[#d3d7ff] text-[10px] font-bold rounded uppercase tracking-wider">
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
                    ? "bg-[#d3d7ff]/10 border border-[#d3d7ff]/20 translate-x-1"
                    : "border border-transparent hover:bg-[#32353d]/30"
                }`}
              >
                {/* Luminous Node Dot */}
                <div
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    hasPending
                      ? "bg-[#ffb4ab] shadow-[0_0_8px_#ffb4ab]"
                      : "bg-[#afbaff] shadow-[0_0_8px_#afbaff]"
                  }`}
                />

                <div className="flex-1 overflow-hidden">
                  <p
                    className={`text-[12px] font-bold tracking-[0.1em] uppercase transition-colors truncate ${
                      activeProjectId === project.id
                        ? "text-[#d3d7ff]"
                        : "text-[#e0e2ec] group-hover:text-[#d3d7ff]"
                    }`}
                  >
                    {project.name}
                  </p>
                  <p className="text-[12px] text-[#c6c5d1]/60 truncate mt-0.5">
                    {project.client?.name || "Unknown Identity"}
                  </p>
                </div>

                <ChevronRight
                  className={`w-[18px] h-[18px] transition-colors ${
                    activeProjectId === project.id
                      ? "text-[#d3d7ff]"
                      : "text-[#c6c5d1]/40"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANEL: Active Chat & Requests */}
      <div className="flex-1 bg-[#1b2131]/45 backdrop-blur-[24px] border border-[rgba(175,186,255,0.15)] rounded-xl flex items-center justify-center relative overflow-hidden shadow-2xl">
        {/* Subtle dot grid background for the technical feel */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #afbaff 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />

        {!activeProject ? (
          /* EMPTY STATE: High Fidelity Awaiting Signal */
          <div className="relative z-10 text-center px-8 max-w-lg">
            <div className="relative w-48 h-48 mx-auto mb-8 flex items-center justify-center">
              <div className="absolute inset-0 border border-[#afbaff]/20 rounded-full animate-[ping_3s_linear_infinite]" />
              <div className="absolute inset-4 border border-[#e8b3ff]/10 rounded-full animate-[ping_4s_linear_infinite_1s]" />
              <div className="w-32 h-32 rounded-full bg-[#1b2131]/45 backdrop-blur-[24px] border border-[rgba(175,186,255,0.3)] flex items-center justify-center relative shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-[#AFBAFF] to-[#F8C1EE] opacity-10 rounded-full blur-xl" />
                <Terminal className="w-16 h-16 text-[#e8b3ff] stroke-[1]" />
              </div>
              <div className="absolute top-0 right-4 w-4 h-4 rounded-full bg-gradient-to-br from-[#AFBAFF] to-[#F8C1EE] shadow-lg shadow-[#afbaff]/20 animate-bounce" />
              <div className="absolute bottom-4 left-0 w-3 h-3 rounded-full bg-[#f6d9ff] shadow-lg shadow-[#e8b3ff]/20 animate-pulse" />
            </div>
            <h2 className="text-[32px] font-medium font-['Playfair_Display',_serif] text-[#e0e2ec] mb-4">
              Awaiting Signal...
            </h2>
            <p className="text-[18px] text-[#c6c5d1] mb-8 font-light leading-[1.6]">
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
              <div className="p-6 border-b border-[rgba(175,186,255,0.15)] bg-[#1d2027]/40 flex justify-between items-center">
                <div>
                  <h2 className="text-[24px] font-medium text-[#e0e2ec] font-['Playfair_Display',_serif]">
                    {activeProject.name}
                  </h2>
                  <p className="text-[12px] font-['JetBrains_Mono',_monospace] text-[#c6c5d1]/70 mt-1">
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
                    <span className="font-['JetBrains_Mono',_monospace] text-[12px] text-[#c6c5d1]/40 mb-2">
                      /logs/empty
                    </span>
                    <p className="text-[14px] text-[#c6c5d1]/60 font-light">
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
                            ? "self-end bg-[rgba(175,186,255,0.05)] border border-[rgba(175,186,255,0.2)] text-[#e0e2ec] rounded-tr-sm ml-auto"
                            : "self-start bg-[#1d2027]/60 border border-[rgba(175,186,255,0.05)] text-[#c6c5d1] rounded-tl-sm mr-auto"
                        } shadow-lg`}
                      >
                        <p className="text-[15px] leading-[1.6] mb-2 font-light">
                          {msg.content}
                        </p>
                        <div
                          className={`flex items-center gap-1.5 font-['JetBrains_Mono',_monospace] text-[10px] ${
                            isAdmin
                              ? "justify-end text-[#afbaff]/80"
                              : "justify-start text-[#c6c5d1]/50"
                          }`}
                        >
                          <span>{timeString}</span>
                          {isAdmin &&
                            (msg.isRead ? (
                              <CheckCheck className="w-[14px] h-[14px] text-[#e8b3ff]" />
                            ) : (
                              <Check className="w-[14px] h-[14px]" />
                            ))}
                        </div>
                      </div>
                    );
                  })
                )}

                {clientIsTyping && (
                  <div className="self-start bg-[#1d2027]/60 border border-[rgba(175,186,255,0.05)] px-5 py-4 rounded-2xl rounded-tl-sm flex gap-2 w-fit">
                    <span
                      className="w-1.5 h-1.5 bg-[#afbaff] rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-[#e8b3ff] rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-[#f8c1ee] rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-6 bg-[#1d2027]/40 border-t border-[rgba(175,186,255,0.15)]">
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
                    className="flex-1 bg-[rgba(27,33,49,0.45)] backdrop-blur-md border border-[rgba(175,186,255,0.2)] rounded-lg px-5 py-3.5 text-[14px] text-[#e0e2ec] font-light placeholder:text-[#c6c5d1]/40 focus:outline-none focus:border-[#afbaff] focus:ring-1 focus:ring-[#afbaff] transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isPending}
                    className="bg-gradient-to-r from-[#AFBAFF] to-[#F8C1EE] px-6 rounded-lg text-[#1f2b67] font-bold text-[12px] tracking-[0.1em] uppercase hover:opacity-90 disabled:opacity-50 disabled:grayscale transition-all flex justify-center items-center cursor-pointer disabled:cursor-not-allowed shadow-[0_0_15px_rgba(175,186,255,0.2)]"
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
              <h3 className="text-[12px] font-bold tracking-[0.1em] uppercase text-[#c6c5d1] flex items-center gap-2 mb-6">
                <AlertCircle className="w-[14px] h-[14px] text-[#ffb4ab]" />
                Matrix Requests
              </h3>

              <div className="space-y-4">
                {activeProject.requests.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-[rgba(175,186,255,0.15)] text-center">
                    <p className="text-[12px] font-['JetBrains_Mono',_monospace] text-[#c6c5d1]/50 uppercase tracking-widest">
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
                        <h4 className="text-[14px] font-semibold text-[#e0e2ec] leading-tight">
                          {req.title}
                        </h4>
                        <span
                          className={`text-[9px] font-['JetBrains_Mono',_monospace] px-2 py-1 rounded shrink-0 uppercase tracking-widest font-bold ${
                            req.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : req.status === "reviewing"
                                ? "bg-[#afbaff]/10 text-[#afbaff] border border-[#afbaff]/20"
                                : "bg-[#ffb4ab]/10 text-[#ffb4ab] border border-[#ffb4ab]/20"
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                      <p className="text-[13px] text-[#c6c5d1]/80 font-light leading-relaxed line-clamp-2">
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
                          className="flex-1 bg-[#10131a] border border-[rgba(175,186,255,0.2)] text-[12px] text-[#e0e2ec] px-3 py-2 rounded outline-none focus:border-[#afbaff] transition-colors appearance-none"
                        >
                          <option value="pending">Pending Signal</option>
                          <option value="reviewing">In Review</option>
                          <option value="completed">Execution Complete</option>
                        </select>
                        <button
                          type="submit"
                          disabled={savingReqs[req.id]}
                          className="bg-transparent border border-[rgba(175,186,255,0.3)] hover:bg-[rgba(175,186,255,0.1)] text-[#afbaff] disabled:opacity-50 text-[11px] font-bold uppercase tracking-widest px-4 py-2 rounded transition-all flex items-center justify-center min-w-[70px]"
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
