<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import {
  GraduationCap,
  Menu,
  MessageSquare,
  Plus,
  ShieldCheck,
  Sparkles,
  X,
} from "@lucide/vue";
import ChatComposer from "./components/ChatComposer.vue";
import MessageBubble from "./components/MessageBubble.vue";
import { ChatApiError, sendChatMessage } from "./services/chatApi";
import type { DisplayMessage, StoredConversation } from "./types/chat";

const STORAGE_KEY = "graduate-policy-chat-state-v1";
const USER_KEY = "graduate-policy-chat-user-v1";

const promptSuggestions = [
  "我是今年毕业生，想了解本地就业补贴",
  "应届毕业生自主创业通常有哪些扶持政策？",
  "咨询就业创业政策前，我需要准备哪些个人信息？",
];

const conversations = ref<StoredConversation[]>([]);
const activeSessionId = ref("");
const draft = ref("");
const busy = ref(false);
const sidebarOpen = ref(false);
const messageList = ref<HTMLElement | null>(null);
let controller: AbortController | null = null;

const userId = getOrCreateUserId();
const activeConversation = computed(() =>
  conversations.value.find((item) => item.sessionId === activeSessionId.value),
);
const messages = computed(() => activeConversation.value?.messages ?? []);

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

function newConversation(): void {
  controller?.abort();
  const conversation: StoredConversation = {
    sessionId: createId("session"),
    title: "新对话",
    messages: [],
  };
  conversations.value.unshift(conversation);
  activeSessionId.value = conversation.sessionId;
  draft.value = "";
  busy.value = false;
  sidebarOpen.value = false;
}

function selectConversation(sessionId: string): void {
  if (busy.value) controller?.abort();
  activeSessionId.value = sessionId;
  busy.value = false;
  draft.value = "";
  sidebarOpen.value = false;
  void scrollToBottom();
}

function updateTitle(conversation: StoredConversation, text: string): void {
  if (conversation.title !== "新对话") return;
  const normalized = text.replace(/\s+/g, " ").trim();
  conversation.title = normalized.length > 18 ? `${normalized.slice(0, 18)}…` : normalized;
}

async function send(text = draft.value): Promise<void> {
  const content = text.trim();
  const conversation = activeConversation.value;
  if (!content || busy.value || !conversation) return;

  updateTitle(conversation, content);
  const userMessage: DisplayMessage = {
    id: createId("message"),
    role: "user",
    content,
    status: "sent",
  };
  const assistantIndex = conversation.messages.push(userMessage, {
    id: createId("message"),
    role: "assistant",
    content: "",
    status: "sending",
  }) - 1;
  const assistantMessage = conversation.messages[assistantIndex];
  draft.value = "";
  busy.value = true;
  const requestController = new AbortController();
  controller = requestController;
  await scrollToBottom();

  try {
    const response = await sendChatMessage(
      {
        sessionId: conversation.sessionId,
        userId,
        message: content,
        userProfile: {},
      },
      requestController.signal,
    );
    assistantMessage.content = response.replyText;
    assistantMessage.status = "sent";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      assistantMessage.status = "error";
      assistantMessage.errorMessage = "回答已停止";
    } else {
      const apiError = error instanceof ChatApiError ? error : null;
      assistantMessage.status = "error";
      assistantMessage.errorMessage = apiError?.traceId
        ? `${apiError.message}（追踪号：${apiError.traceId}）`
        : apiError?.message ?? "请求失败，请稍后重试";
    }
  } finally {
    if (controller === requestController) {
      busy.value = false;
      controller = null;
    }
    await scrollToBottom();
  }
}

function retry(message: DisplayMessage): void {
  const conversation = activeConversation.value;
  if (!conversation || busy.value) return;
  const index = conversation.messages.findIndex((item) => item.id === message.id);
  const userMessage = conversation.messages[index - 1];
  if (index < 1 || userMessage?.role !== "user") return;
  conversation.messages.splice(index - 1, 2);
  void send(userMessage.content);
}

async function scrollToBottom(): Promise<void> {
  await nextTick();
  messageList.value?.scrollTo({ top: messageList.value.scrollHeight, behavior: "smooth" });
}

watch(
  conversations,
  (value) => localStorage.setItem(STORAGE_KEY, JSON.stringify(value)),
  { deep: true },
);

onMounted(() => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as StoredConversation[];
    conversations.value = Array.isArray(saved) ? saved.slice(0, 20) : [];
  } catch {
    conversations.value = [];
  }
  if (conversations.value.length === 0) newConversation();
  else activeSessionId.value = conversations.value[0].sessionId;
});
</script>

<template>
  <div class="app-shell">
    <div v-if="sidebarOpen" class="sidebar-scrim" @click="sidebarOpen = false"></div>
    <aside class="sidebar" :class="{ 'sidebar--open': sidebarOpen }">
      <div class="brand-row">
        <div class="brand-mark"><GraduationCap :size="21" /></div>
        <div>
          <strong>青程</strong>
          <span>应届生就业创业政策助手</span>
        </div>
        <button class="icon-button mobile-only" type="button" title="关闭侧栏" @click="sidebarOpen = false">
          <X :size="19" />
        </button>
      </div>

      <button class="new-chat-button" type="button" @click="newConversation">
        <Plus :size="17" />
        新建对话
      </button>

      <div class="history-section">
        <p class="sidebar-label">最近对话</p>
        <button
          v-for="conversation in conversations"
          :key="conversation.sessionId"
          type="button"
          class="history-item"
          :class="{ 'history-item--active': conversation.sessionId === activeSessionId }"
          @click="selectConversation(conversation.sessionId)"
        >
          <MessageSquare :size="16" />
          <span>{{ conversation.title }}</span>
        </button>
      </div>

      <div class="sidebar-footer">
        <ShieldCheck :size="17" />
        <span>AI 生成内容请结合实际核验</span>
      </div>
    </aside>

    <main class="chat-panel">
      <header class="topbar">
        <button class="icon-button mobile-only" type="button" title="打开侧栏" @click="sidebarOpen = true">
          <Menu :size="20" />
        </button>
        <div class="topbar-title">
          <span>{{ activeConversation?.title ?? "新对话" }}</span>
          <small><i></i> 对话服务</small>
        </div>
        <button class="icon-button desktop-only" type="button" title="新建对话" @click="newConversation">
          <Plus :size="19" />
        </button>
        <span class="topbar-spacer mobile-only"></span>
      </header>

      <section ref="messageList" class="message-list" aria-live="polite">
        <div v-if="messages.length === 0" class="empty-state">
          <div class="empty-icon"><Sparkles :size="24" /></div>
          <h1>你好，我是青程</h1>
          <p>和我聊聊你的就业或创业情况，先把需求说明白。</p>
          <div class="suggestions">
            <button v-for="item in promptSuggestions" :key="item" type="button" @click="draft = item; send()">
              <span>{{ item }}</span>
              <span aria-hidden="true">↗</span>
            </button>
          </div>
        </div>
        <div v-else class="message-container">
          <MessageBubble
            v-for="message in messages"
            :key="message.id"
            :message="message"
            @retry="retry"
          />
        </div>
      </section>

      <footer class="composer-area">
        <div class="composer-container">
          <ChatComposer v-model="draft" :busy="busy" @send="send()" />
          <p class="disclaimer">当前未接入政策库，具体政策以当地官方发布为准</p>
        </div>
      </footer>
    </main>
  </div>
</template>
