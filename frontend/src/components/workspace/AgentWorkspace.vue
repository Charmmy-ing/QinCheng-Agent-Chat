<script setup lang="ts">
import type { Component } from "vue";
import { FlaskConical, PanelRight } from "@lucide/vue";
import FileRequestBlock from "./FileRequestBlock.vue";
import MissingFieldBlock from "./MissingFieldBlock.vue";
import PolicyMatchBlock from "./PolicyMatchBlock.vue";
import ProfileSummaryBlock from "./ProfileSummaryBlock.vue";
import TaskProgress from "./TaskProgress.vue";
import type { AgentAction, WorkspaceBlock, WorkspaceState } from "../../types/agent";

defineProps<{ state: WorkspaceState; busy: boolean }>();
const emit = defineEmits<{ action: [action: AgentAction] }>();

const blockComponents: Record<WorkspaceBlock["type"], Component> = {
  missing_field: MissingFieldBlock,
  profile_summary: ProfileSummaryBlock,
  file_request: FileRequestBlock,
  policy_matches: PolicyMatchBlock,
};
</script>

<template>
  <aside class="agent-workspace">
    <header class="panel-topbar workspace-topbar">
      <PanelRight :size="19" />
      <div class="panel-heading-copy">
        <strong>Agent 工作台</strong>
        <span>{{ state.phaseLabel }}</span>
      </div>
      <span class="mock-badge"><FlaskConical :size="13" />交互演示</span>
    </header>

    <div class="workspace-scroll">
      <div class="mock-notice">
        当前工作区由前端演示状态驱动，未执行政策检索、资格判断或文件解析。
      </div>
      <TaskProgress :task="state.task" />
      <component
        :is="blockComponents[block.type]"
        v-for="block in state.blocks"
        :key="block.id"
        :block="block"
        :disabled="busy"
        @action="emit('action', $event)"
      />
    </div>
  </aside>
</template>
