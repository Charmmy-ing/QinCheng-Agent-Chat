<script setup lang="ts">
import { CircleHelp } from "@lucide/vue";
import type { AgentAction, WorkspaceBlock } from "../../types/agent";

type MissingFieldBlock = Extract<WorkspaceBlock, { type: "missing_field" }>;

const props = defineProps<{ block: MissingFieldBlock; disabled: boolean }>();
const emit = defineEmits<{ action: [action: AgentAction] }>();

function choose(label: string, value: string): void {
  emit("action", {
    id: `field-${Date.now()}`,
    type: "provide_field",
    fieldKey: props.block.fieldKey,
    label,
    value,
  });
}
</script>

<template>
  <section class="workspace-section action-section">
    <div class="action-title"><CircleHelp :size="18" /><strong>{{ block.title }}</strong></div>
    <p>{{ block.description }}</p>
    <div class="option-grid">
      <button
        v-for="option in block.options"
        :key="option.value"
        type="button"
        :disabled="disabled"
        @click="choose(option.label, option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </section>
</template>
