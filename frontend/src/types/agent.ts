import type { UserProfile } from "./chat";

export type AgentPhase =
  | "collecting_profile"
  | "waiting_for_policy_search"
  | "checking_eligibility"
  | "waiting_for_material"
  | "planning";

export type TaskStepStatus = "done" | "current" | "pending" | "blocked";

export interface TaskStep {
  id: string;
  label: string;
  status: TaskStepStatus;
  note?: string;
}

export interface Task {
  id: string;
  title: string;
  steps: TaskStep[];
}

export interface AgentDocument {
  id: string;
  name: string;
  size: number;
  status: "selected" | "uploaded" | "parsed" | "error";
  isMock: boolean;
}

export interface PolicyDetail {
  sourceName: string;
  sourceUrl?: string;
  clauseExcerpt?: string;
  region?: string;
  publishedAt?: string;
  effectiveAt?: string;
}

export interface PolicyMatch {
  id: string;
  name: string;
  status: "potential" | "pending" | "not_eligible";
  matchReason: string;
  nextAction?: string;
  satisfiedConditions: string[];
  missingConditions: string[];
  detail: PolicyDetail;
  isMock: boolean;
}

export interface ProfileDisplayField {
  key: string;
  label: string;
  value: string;
  sourceLabel: string;
}

export interface OptionItem {
  label: string;
  value: string;
}

export type WorkspaceBlock =
  | {
      id: string;
      type: "missing_field";
      title: string;
      description: string;
      fieldKey: "employmentStatus";
      options: OptionItem[];
    }
  | {
      id: string;
      type: "profile_summary";
      title: string;
      fields: ProfileDisplayField[];
    }
  | {
      id: string;
      type: "file_request";
      title: string;
      description: string;
      acceptedTypes: string[];
      document?: AgentDocument;
    }
  | {
      id: string;
      type: "policy_matches";
      title: string;
      matches: PolicyMatch[];
    };

export interface WorkspaceState {
  sessionId: string;
  mode: "mock" | "live";
  phase: AgentPhase;
  phaseLabel: string;
  task: Task;
  profile: UserProfile;
  documents: AgentDocument[];
  policyMatches: PolicyMatch[];
  blocks: WorkspaceBlock[];
}

export type AgentAction =
  | {
      id: string;
      type: "provide_field";
      fieldKey: "employmentStatus";
      value: string;
      label: string;
    }
  | {
      id: string;
      type: "select_file";
      fileName: string;
      fileSize: number;
    };

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "sending" | "sent" | "error";
  errorMessage?: string;
}

export interface ChatSession {
  sessionId: string;
  title: string;
  messages: ChatMessage[];
  workspace: WorkspaceState;
}
