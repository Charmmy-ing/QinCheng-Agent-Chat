<script setup lang="ts">
import { computed } from "vue";
import { Check, Circle, Clock3, LockKeyhole } from "@lucide/vue";
import type { Task } from "../../types/agent";

const props = defineProps<{ task: Task }>();
const completedCount = computed(
  () => props.task.steps.filter((step) => step.status === "done").length,
);
</script>

<template>
  <section class="workspace-section task-section">
    <div class="workspace-section-heading">
      <span>当前任务</span>
      <small>{{ completedCount }}/{{ task.steps.length }} 已完成</small>
    </div>
    <p class="task-title">{{ task.title }}</p>
    <ol class="task-progress">
      <li
        v-for="step in task.steps"
        :key="step.id"
        :class="`task-step--${step.status}`"
        :aria-current="step.status === 'current' ? 'step' : undefined"
      >
        <span class="task-step-icon" aria-hidden="true">
          <Check v-if="step.status === 'done'" :size="14" />
          <Clock3 v-else-if="step.status === 'current'" :size="14" />
          <LockKeyhole v-else-if="step.status === 'blocked'" :size="13" />
          <Circle v-else :size="13" />
        </span>
        <span class="task-step-copy">
          <strong>{{ step.label }}</strong>
          <small v-if="step.note">{{ step.note }}</small>
        </span>
      </li>
    </ol>
  </section>
</template>
