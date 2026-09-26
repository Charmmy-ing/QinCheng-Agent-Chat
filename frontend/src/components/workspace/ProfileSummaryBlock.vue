<script setup lang="ts">
import { UserRoundCheck } from "@lucide/vue";
import type { WorkspaceBlock } from "../../types/agent";

type ProfileSummaryBlock = Extract<WorkspaceBlock, { type: "profile_summary" }>;
defineProps<{ block: ProfileSummaryBlock }>();
</script>

<template>
  <section class="workspace-section">
    <div class="action-title"><UserRoundCheck :size="18" /><strong>{{ block.title }}</strong></div>
    <dl class="profile-list">
      <div v-for="field in block.fields" :key="field.key">
        <dt>{{ field.label }}</dt>
        <dd>{{ field.value }}<small>{{ field.sourceLabel }}</small></dd>
      </div>
    </dl>
  </section>
</template>
