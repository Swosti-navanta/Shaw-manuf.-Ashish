"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp, CaretLeft, X } from "@phosphor-icons/react";
import { AiStar, Button } from "@navanta-ai/design-system";
import { useChatPanel } from "@/context/ChatPanelContext";
import { agentForPath, type ChatPrompt } from "@/data/chat-agents";

/**
 * The agent that owns the page, docked to the right of it.
 *
 * Per page rather than one assistant for the app: the agent named here is the
 * one whose queue that surface carries, so asking it something is asking the
 * thing that did the work. The chips are authored per page for the same reason
 * — a fixed set would ask four questions about somebody else's job on three
 * pages out of four.
 *
 * Collapsed to an edge tab by default, and closing returns it there rather
 * than dismissing it for the session — the agent stays visibly present without
 * taking width from the board or the queue until it is asked something.
 */

/** The AI wordmark colour, matching the DS's own usage. */
const AI_TEXT = "#3B0764";

/* The id rides alongside rather than inside each member: `Omit<Message, "id">`
   over a union keeps only the keys every member shares, which erases `text`. */
type MessageBody =
  | { kind: "user"; text: string }
  | { kind: "agent"; text: string }
  | { kind: "answer"; note: string; rows: ReadonlyArray<{ label: string; text: string }> };

type Message = MessageBody & { id: number };

export default function ChatPanel() {
  const { open, openChat, closeChat } = useChatPanel();
  const pathname = usePathname();
  const page = agentForPath(pathname);

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const nextId = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const askRef = useRef<HTMLTextAreaElement>(null);

  // A new page is a new agent, so the thread starts over rather than carrying
  // Sawyer's answers into a conversation with Wren.
  //
  // Adjusted during render off a stored previous value rather than in an
  // effect: an effect would paint the old agent's transcript under the new
  // agent's name for a frame, then cascade a second render to clear it. This is
  // React's documented pattern for resetting state when an input changes.
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setMessages([]);
    setDraft("");
    setTyping(false);
  }

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  const push = (m: MessageBody) =>
    setMessages((cur) => [...cur, { ...m, id: nextId.current++ }]);

  /** A chip asks its question and the agent answers it — the pause is there so
   *  the answer reads as a reply rather than as text that was always present. */
  const ask = (prompt: ChatPrompt) => {
    push({ kind: "user", text: prompt.label });
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      push({ kind: "answer", note: prompt.answer.note, rows: prompt.answer.rows });
    }, 520);
  };

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    push({ kind: "user", text });
    setDraft("");
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      push({
        kind: "agent",
        text: `This demo answers the suggestions below rather than free text. ${page.agent} would read this against ${page.role.toLowerCase()} and come back with what it found.`,
      });
    }, 560);
  };

  const started = messages.length > 0;

  // Collapsed: an edge tab, so the agent is still visibly there.
  if (!open) {
    return (
      <button
        type="button"
        onClick={openChat}
        aria-label={`Open ${page.agent}`}
        title={`Open ${page.agent}`}
        className="shrink-0 flex flex-col items-center transition-colors"
        style={{
          width: 34,
          gap: 8,
          paddingTop: 14,
          background: "var(--surface-chrome, var(--surface-raised))",
          borderLeft: "1px solid var(--border-default)",
          cursor: "pointer",
        }}
      >
        <CaretLeft size={13} weight="bold" color="var(--ds-text-secondary)" />
        <AiStar size={15} />
        <span
          style={{
            writingMode: "vertical-rl",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.06em",
            color: AI_TEXT,
          }}
        >
          {page.agent}
        </span>
      </button>
    );
  }

  return (
    <aside
      aria-label={`${page.agent} chat`}
      className="shrink-0 flex flex-col"
      style={{
        width: 340,
        background: "var(--surface-chrome, var(--surface-raised))",
        borderLeft: "1px solid var(--border-default)",
      }}
    >
      {/* Header — named, then labelled with what it is accountable for. */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{ height: 48, padding: "0 12px 0 14px" }}
      >
        <span className="flex items-center min-w-0" style={{ gap: 8 }}>
          <AiStar size={16} />
          <span className="flex flex-col min-w-0">
            <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.25, color: AI_TEXT }}>
              {page.agent}
            </span>
            <span className="type-caption truncate" style={{ color: "var(--ds-text-secondary)" }}>
              {page.role}
            </span>
          </span>
        </span>
        <span className="flex items-center" style={{ gap: 2 }}>
          {started && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMessages([])}
              className="h-7 px-2 text-[12px] font-normal"
            >
              New
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={closeChat} aria-label="Collapse chat" className="size-7">
            <X size={14} />
          </Button>
        </span>
      </div>

      {/* Body */}
      <div className="flex min-h-px flex-1 items-stretch" style={{ padding: "0 8px 8px" }}>
        <div
          className="flex min-w-px flex-1 flex-col justify-end overflow-hidden"
          style={{
            gap: 10,
            borderRadius: 14,
            background: "var(--surface-base)",
            border: "1px solid var(--border-default)",
          }}
        >
          {started ? (
            <div
              ref={scrollRef}
              className="hide-scrollbar flex min-h-px flex-1 flex-col overflow-y-auto"
              style={{ gap: 10, padding: "12px 12px 0" }}
            >
              {messages.map((m) =>
                m.kind === "user" ? (
                  <UserBubble key={m.id} text={m.text} />
                ) : m.kind === "agent" ? (
                  <AgentText key={m.id} text={m.text} />
                ) : (
                  <AnswerCard key={m.id} note={m.note} rows={m.rows} />
                ),
              )}
              {typing && <TypingDots />}
            </div>
          ) : (
            <div className="flex min-h-px flex-1 flex-col justify-center" style={{ gap: 14, padding: "0 12px" }}>
              <span className="flex flex-col" style={{ gap: 6 }}>
                <AiStar size={18} />
                <span className="type-body" style={{ color: "var(--ds-text-primary)", lineHeight: 1.45 }}>
                  {page.intro}
                </span>
              </span>
              <div className="flex flex-col" style={{ gap: 7 }}>
                {page.prompts.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => ask(p)}
                    className="text-left transition-colors hover:bg-[var(--surface-hover)]"
                    style={{
                      padding: "9px 12px",
                      borderRadius: 10,
                      border: "1px solid var(--border-default)",
                      background: "var(--surface-base)",
                      cursor: "pointer",
                      fontSize: 13,
                      lineHeight: 1.35,
                      color: "var(--ds-text-primary)",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Composer */}
          <div className="flex w-full shrink-0 flex-col" style={{ gap: 8, padding: "0 12px 12px" }}>
            <div
              className="flex w-full flex-col"
              style={{
                gap: 8,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid var(--border-default)",
                background: "var(--surface-base)",
              }}
            >
              {/* A textarea rather than an input: what people type here is a
                  sentence about a run, and an input can only scroll sideways. */}
              <textarea
                ref={askRef}
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={`Ask ${page.agent}…`}
                aria-label={`Ask ${page.agent} a question`}
                className="w-full resize-none border-0 bg-transparent p-0 outline-none placeholder:text-[var(--ds-text-placeholder,var(--text-muted))]"
                style={{ fontSize: 13, lineHeight: "19px", maxHeight: 92, overflowY: "auto" }}
              />
              <div className="flex w-full items-center justify-end">
                <Button
                  variant="primary"
                  size="icon"
                  aria-label="Send"
                  onClick={send}
                  disabled={draft.trim().length === 0}
                  className="size-6 rounded-[8px]"
                >
                  <ArrowUp size={14} weight="bold" color="#FFFFFF" />
                </Button>
              </div>
            </div>
            <p
              className="w-full text-center"
              style={{ fontSize: 11, lineHeight: 1.4, color: "var(--ds-text-placeholder, var(--text-muted))" }}
            >
              {page.agent} is AI and can make mistakes. Check anything it commits.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end" style={{ marginBottom: 2 }}>
      <span
        style={{
          maxWidth: "88%",
          padding: "7px 11px",
          borderRadius: "12px 12px 3px 12px",
          background: "var(--surface-raised)",
          border: "1px solid var(--border-light)",
          fontSize: 13,
          lineHeight: 1.4,
          color: "var(--ds-text-primary)",
        }}
      >
        {text}
      </span>
    </div>
  );
}

function AgentText({ text }: { text: string }) {
  return (
    <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ds-text-secondary)" }}>{text}</p>
  );
}

/** The agent's answer: a one-line read, then the facts behind it. Structured
 *  rather than prose, because the rows are what a person checks. */
function AnswerCard({
  note,
  rows,
}: {
  note: string;
  rows: ReadonlyArray<{ label: string; text: string }>;
}) {
  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      <span className="flex items-start" style={{ gap: 7 }}>
        <span style={{ paddingTop: 1 }}>
          <AiStar size={14} />
        </span>
        <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ds-text-primary)" }}>
          {note}
        </span>
      </span>
      <div
        className="flex flex-col"
        style={{ borderRadius: 10, border: "1px solid var(--border-light)", overflow: "hidden" }}
      >
        {rows.map((r, i) => (
          <span
            key={r.label}
            className="flex flex-col"
            style={{
              gap: 1,
              padding: "7px 10px",
              borderTop: i === 0 ? "none" : "1px solid var(--border-light)",
            }}
          >
            <span
              style={{
                fontSize: 10,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--ds-text-placeholder, var(--text-muted))",
              }}
            >
              {r.label}
            </span>
            <span style={{ fontSize: 12.5, lineHeight: 1.4, color: "var(--ds-text-primary)" }}>
              {r.text}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex items-center" style={{ gap: 4, padding: "2px 0" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "var(--ds-text-placeholder, var(--text-muted))",
            animation: `chat-dot 1s ${i * 0.16}s infinite ease-in-out`,
          }}
        />
      ))}
    </span>
  );
}
