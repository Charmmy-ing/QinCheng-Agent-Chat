import { computed, onMounted, ref, watch } from "vue";
import { ChatApiError, sendChatMessage } from "../services/chatApi";
import {
  applyMockAction,
  createMockWorkspace,
} from "../services/workspaceMock";
import type { UserProfile } from "../types/chat";
import type {
  AgentAction,
  ChatMessage,
  ChatSession,
} from "../types/agent";

const STORAGE_KEY = "graduate-policy-agent-workbench-v1";
const USER_KEY = "graduate-policy-chat-user-v1";

function createId(prefix: string): string {
  const suffix = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${suffix}`;
}

function getOrCreateUserId(): string {
  const existing = localStorage.getItem(USER_KEY);
  if (existing) return existing;
  const value = createId("user");
  localStorage.setItem(USER_KEY, value);
  return value;
}

function createSession(): ChatSession {
  const sessionId = createId("session");
  return {
    sessionId,
    title: "新对话",
    messages: [],
    workspace: createMockWorkspace(sessionId),
  };
}

function restoreSessions(): ChatSession[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as ChatSession[];
    if (!Array.isArray(saved)) return [];
    return saved.slice(0, 20).map((session) => ({
      ...session,
      messages: session.messages.map((message) =>
        message.status === "sending"
          ? { ...message, status: "error", errorMessage: "上次请求已中断" }
          : message,
      ),
      workspace: session.workspace ?? createMockWorkspace(session.sessionId),
    }));
  } catch {
    return [];
  }
}

export function useAgentWorkbench() {
  const sessions = ref<ChatSession[]>([]);
  const activeSessionId = ref("");
  const draft = ref("");
  const busy = ref(false);
  const sidebarOpen = ref(false);
  let controller: AbortController | null = null;
  const userId = getOrCreateUserId();

  const activeSession = computed(() =>
    sessions.value.find((session) => session.sessionId === activeSessionId.value),
  );
  const messages = computed(() => activeSession.value?.messages ?? []);
  const workspace = computed(() => activeSession.value?.workspace);

  function newSession(): void {
    controller?.abort();
    const session = createSession();
    sessions.value.unshift(session);
    activeSessionId.value = session.sessionId;
    draft.value = "";
    busy.value = false;
    sidebarOpen.value = false;
  }

  function selectSession(sessionId: string): void {
    if (sessionId === activeSessionId.value) {
      sidebarOpen.value = false;
      return;
    }
    controller?.abort();
    activeSessionId.value = sessionId;
    draft.value = "";
    busy.value = false;
    sidebarOpen.value = false;
  }

  function updateTitle(session: ChatSession, text: string): void {
    if (session.title !== "新对话") return;
    const normalized = text.replace(/\s+/g, " ").trim();
    session.title = normalized.length > 18 ? `${normalized.slice(0, 18)}…` : normalized;
  }

  async function send(
    text = draft.value,
    profileOverride?: UserProfile,
  ): Promise<void> {
    const content = text.trim();
    const session = activeSession.value;
    if (!content || busy.value || !session) return;

    updateTitle(session, content);
    const userMessage: ChatMessage = {
      id: createId("message"),
      role: "user",
      content,
      status: "sent",
    };
    const assistantIndex = session.messages.push(userMessage, {
      id: createId("message"),
      role: "assistant",
      content: "",
      status: "sending",
    }) - 1;
    const assistantMessage = session.messages[assistantIndex];
    draft.value = "";
    busy.value = true;
    const requestController = new AbortController();
    controller = requestController;

    try {
      const response = await sendChatMessage(
        {
          sessionId: session.sessionId,
          userId,
          message: content,
          userProfile: profileOverride ?? session.workspace.profile,
        },
        requestController.signal,
      );
      assistantMessage.content = response.replyText;
      assistantMessage.status = "sent";
      session.workspace.profile = {
        ...session.workspace.profile,
        ...response.userProfile,
      };
    } catch (error) {
      assistantMessage.status = "error";
      if (error instanceof DOMException && error.name === "AbortError") {
        assistantMessage.errorMessage = "回答已停止";
      } else {
        const apiError = error instanceof ChatApiError ? error : null;
        assistantMessage.errorMessage = apiError?.traceId
          ? `${apiError.message}（追踪号：${apiError.traceId}）`
          : apiError?.message ?? "请求失败，请稍后重试";
      }
    } finally {
      if (controller === requestController) {
        busy.value = false;
        controller = null;
      }
    }
  }

  function retry(message: ChatMessage): void {
    const session = activeSession.value;
    if (!session || busy.value) return;
    const index = session.messages.findIndex((item) => item.id === message.id);
    const userMessage = session.messages[index - 1];
    if (index < 1 || userMessage?.role !== "user") return;
    session.messages.splice(index - 1, 2);
    void send(userMessage.content);
  }

  function runWorkspaceAction(action: AgentAction): void {
    const session = activeSession.value;
    if (!session || busy.value) return;
    const transition = applyMockAction(session.workspace, action);
    session.workspace = transition.state;
    void send(transition.chatMessage, transition.state.profile);
  }

  watch(
    sessions,
    (value) => localStorage.setItem(STORAGE_KEY, JSON.stringify(value)),
    { deep: true },
  );

  onMounted(() => {
    sessions.value = restoreSessions();
    if (sessions.value.length === 0) newSession();
    else activeSessionId.value = sessions.value[0].sessionId;
  });

  return {
    sessions,
    activeSession,
    activeSessionId,
    messages,
    workspace,
    draft,
    busy,
    sidebarOpen,
    newSession,
    selectSession,
    send,
    retry,
    runWorkspaceAction,
  };
}
