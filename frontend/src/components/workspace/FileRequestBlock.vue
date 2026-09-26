<script setup lang="ts">
import { ref } from "vue";
import { FileCheck2, Upload } from "@lucide/vue";
import type { AgentAction, WorkspaceBlock } from "../../types/agent";

type FileRequestBlock = Extract<WorkspaceBlock, { type: "file_request" }>;
const props = defineProps<{ block: FileRequestBlock; disabled: boolean }>();
const emit = defineEmits<{ action: [action: AgentAction] }>();
const input = ref<HTMLInputElement | null>(null);

function chooseFile(): void {
  if (!props.disabled) input.value?.click();
}

function onFile(event: Event): void {
  const element = event.target as HTMLInputElement;
  const file = element.files?.[0];
  if (!file) return;
  emit("action", {
    id: `document-${Date.now()}`,
    type: "select_file",
    fileName: file.name,
    fileSize: file.size,
  });
  element.value = "";
}

function formatSize(size: number): string {
  return size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} KB`
    : `${(size / 1024 / 1024).toFixed(1)} MB`;
}
</script>

<template>
  <section class="workspace-section action-section">
    <div class="action-title"><Upload :size="18" /><strong>{{ block.title }}</strong></div>
    <p>{{ block.description }}</p>
    <div v-if="block.document" class="selected-file">
      <FileCheck2 :size="18" />
      <span><strong>{{ block.document.name }}</strong><small>{{ formatSize(block.document.size) }} · 未上传</small></span>
    </div>
    <button v-else type="button" class="upload-button" :disabled="disabled" @click="chooseFile">
      <Upload :size="16" />
      选择文件
    </button>
    <input ref="input" class="visually-hidden" type="file" :accept="block.acceptedTypes.join(',')" @change="onFile" />
  </section>
</template>
