"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type { AgentTask } from "@/types/agent-task";

interface ChatPanelContextValue {
  /** The panel is open. */
  open: boolean;
  /** The task currently running / shown, if any. */
  task: AgentTask | null;
  /** Fire a scoped run — opens the panel and narrates it. */
  startTask: (task: AgentTask) => void;
  /** Open the panel with no task (the ⌘K / ask entry). */
  openChat: () => void;
  close: () => void;
}

const ChatPanelContext = createContext<ChatPanelContextValue | undefined>(undefined);

/**
 * One chat panel for the whole portal. A row action or a card CTA fires
 * `startTask`; the panel narrates the run and shows its outcome. The transcript
 * clears on route change — a run is scoped to the screen it was raised from, so
 * carrying it to another seat would be a lie about what the agent just did.
 */
export function ChatPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [task, setTask] = useState<AgentTask | null>(null);
  const pathname = usePathname();
  const [prevPath, setPrevPath] = useState(pathname);

  // Reset on navigation — the run belongs to the screen it was raised from.
  // Adjusting state during render on a changed value is React's sanctioned
  // alternative to a route-watching effect.
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setOpen(false);
    setTask(null);
  }

  const startTask = useCallback((t: AgentTask) => {
    setTask(t);
    setOpen(true);
  }, []);
  const openChat = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ open, task, startTask, openChat, close }),
    [open, task, startTask, openChat, close],
  );

  return <ChatPanelContext.Provider value={value}>{children}</ChatPanelContext.Provider>;
}

export function useChatPanel(): ChatPanelContextValue {
  const ctx = useContext(ChatPanelContext);
  if (!ctx) throw new Error("useChatPanel must be used within a ChatPanelProvider");
  return ctx;
}
