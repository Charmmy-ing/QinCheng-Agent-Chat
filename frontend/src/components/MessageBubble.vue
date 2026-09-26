<script setup lang="ts">
import { computed } from "vue";
import { Bot, RotateCcw } from "@lucide/vue";
import DOMPurify from "dompurify";
import MarkdownIt from "markdown-it";
import type { DisplayMessage } from "../types/chat";

const props = defineProps<{
  message: DisplayMessage;
}>();

const emit = defineEmits<{
  retry: [message: DisplayMessage];
}>();

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
});
const renderedContent = computed(() =>
  DOMPurify.sanitize(markdown.render(props.message.content)),
);
</script>

<template>
  <article class="message-row" :class="`message-row--${message.role}`">
    <div v-if="message.role === 'assistant'" class="assistant-avatar" aria-hidden="true">
      <Bot :size="18" :stroke-width="2" />
    </div>
    <div class="message-main">
      <div v-if="message.role === 'user'" class="user-bubble">
        {{ message.content }}
      </div>
      <template v-else>
        <div v-if="message.status === 'sending'" class="typing" aria-label="正在回复">
          <span></span><span></span><span></span>
        </div>
        <div v-else-if="message.status === 'error'" class="error-block" role="alert">
          <p>{{ message.errorMessage }}</p>
          <button type="button" class="text-button" @click="emit('retry', message)">
            <RotateCcw :size="15" />
            重试
          </button>
        </div>
        <div v-else class="assistant-content markdown-body" v-html="renderedContent"></div>
      </template>
    </div>
  </article>
</template>
