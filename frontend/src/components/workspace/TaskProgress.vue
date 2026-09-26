<script setup lang="ts">
import { Check, Circle, Clock3, LockKeyhole } from "@lucide/vue";
import type { Task } from "../../types/agent";

defineProps<{ task: Task }>();
</script>

<template>
  <section class="workspace-section task-section">
    <div class="workspace-section-heading">
      <span>当前任务</span>
      <small>{{ task.title }}</small>
    </div>
    <ol class="task-progress">
      <li v-for="step in task.steps" :key="step.id" :class="`task-step--${step.status}`">
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
