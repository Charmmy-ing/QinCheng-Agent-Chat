<script setup lang="ts">
import { BookOpenCheck, CircleAlert, ExternalLink } from "@lucide/vue";
import type { WorkspaceBlock } from "../../types/agent";

type PolicyMatchBlock = Extract<WorkspaceBlock, { type: "policy_matches" }>;
defineProps<{ block: PolicyMatchBlock }>();

const statusLabels = {
  potential: "可能符合",
  pending: "待确认",
  not_eligible: "当前不符合",
};

function safeSourceUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}
</script>

<template>
  <section class="workspace-section">
    <div class="action-title"><BookOpenCheck :size="18" /><strong>{{ block.title }}</strong></div>
    <article v-for="match in block.matches" :key="match.id" class="policy-card">
      <div class="policy-card-head">
        <strong>{{ match.name }}</strong>
        <span :class="`policy-status policy-status--${match.status}`">{{ statusLabels[match.status] }}</span>
      </div>
      <div v-if="match.isMock" class="mock-policy-note"><CircleAlert :size="14" />模拟结构，不代表真实政策结果</div>
      <p>{{ match.matchReason }}</p>
      <dl class="policy-meta">
        <div>
          <dt>来源</dt>
          <dd>
            <a
              v-if="safeSourceUrl(match.detail.sourceUrl)"
              :href="safeSourceUrl(match.detail.sourceUrl) ?? undefined"
              target="_blank"
              rel="noopener noreferrer"
            >{{ match.detail.sourceName }}<ExternalLink :size="10" /></a>
            <template v-else>{{ match.detail.sourceName }}</template>
          </dd>
        </div>
        <div><dt>地区</dt><dd>{{ match.detail.region ?? "--" }}</dd></div>
        <div><dt>发布时间</dt><dd>{{ match.detail.publishedAt ?? "--" }}</dd></div>
        <div><dt>生效时间</dt><dd>{{ match.detail.effectiveAt ?? "--" }}</dd></div>
      </dl>
      <div v-if="match.satisfiedConditions.length" class="condition-list condition-list--satisfied">
        <strong>已满足条件</strong>
        <ul><li v-for="item in match.satisfiedConditions" :key="item">{{ item }}</li></ul>
      </div>
      <div v-if="match.missingConditions.length" class="condition-list">
        <strong>当前缺失条件</strong>
        <ul><li v-for="item in match.missingConditions" :key="item">{{ item }}</li></ul>
      </div>
      <blockquote v-if="match.detail.clauseExcerpt">{{ match.detail.clauseExcerpt }}</blockquote>
    </article>
  </section>
</template>
