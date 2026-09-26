import type { UserProfile } from "../types/chat";
import type {
  AgentAction,
  AgentDocument,
  PolicyMatch,
  ProfileDisplayField,
  TaskStep,
  WorkspaceBlock,
  WorkspaceState,
} from "../types/agent";

export interface WorkspaceTransition {
  state: WorkspaceState;
  chatMessage: string;
}

const initialSteps: TaskStep[] = [
  { id: "profile", label: "收集个人信息", status: "current" },
  { id: "search", label: "检索政策", status: "pending" },
  { id: "eligibility", label: "判断资格", status: "pending" },
  { id: "materials", label: "检查材料", status: "pending" },
  { id: "plan", label: "规划办理路径", status: "pending" },
];

function missingEmploymentBlock(): WorkspaceBlock {
  return {
    id: "employment-status",
    type: "missing_field",
    title: "还需要你的就业状态",
    description: "这会影响后续政策检索范围。",
    fieldKey: "employmentStatus",
    options: [
      { label: "待就业", value: "待就业" },
      { label: "已就业", value: "已就业" },
      { label: "创业中", value: "创业中" },
    ],
  };
}

function profileFields(profile: UserProfile): ProfileDisplayField[] {
  const fields: ProfileDisplayField[] = [];
  if (profile.city) {
    fields.push({ key: "city", label: "所在地区", value: profile.city, sourceLabel: "用户提供" });
  }
  if (profile.education) {
    fields.push({ key: "education", label: "学历", value: profile.education, sourceLabel: "用户提供" });
  }
  if (profile.graduationYear) {
    fields.push({
      key: "graduationYear",
      label: "毕业年份",
      value: String(profile.graduationYear),
      sourceLabel: "用户提供",
    });
  }
  if (profile.employmentStatus) {
    fields.push({
      key: "employmentStatus",
      label: "就业状态",
      value: profile.employmentStatus,
      sourceLabel: "工作台填写",
    });
  }
  return fields;
}

function profileBlock(profile: UserProfile): WorkspaceBlock {
  return {
    id: "profile-summary",
    type: "profile_summary",
    title: "已识别的信息",
    fields: profileFields(profile),
  };
}

function fileRequestBlock(document?: AgentDocument): WorkspaceBlock {
  return {
    id: "education-document",
    type: "file_request",
    title: "学历证明组件预览",
    description: "当前仅演示文件选择，不会上传、解析或审核文件。",
    acceptedTypes: [".pdf", ".png", ".jpg", ".jpeg"],
    document,
  };
}

function policyPreview(): PolicyMatch {
  return {
    id: "mock-policy-structure",
    name: "政策匹配结果待接入",
    status: "pending",
    matchReason: "此卡片仅展示未来政策匹配结果的结构，不代表任何真实政策结论。",
    nextAction: "等待接入政策知识库和规则模块后，再生成可执行的办理建议。",
    satisfiedConditions: [],
    missingConditions: ["等待政策知识库返回政策依据", "等待规则模块判断资格条件"],
    detail: {
      sourceName: "尚未接入真实政策数据",
      region: "--",
      publishedAt: "--",
      clauseExcerpt: "接入 RAG 后展示可追溯的政策原文片段。",
    },
    isMock: true,
  };
}

export function createMockWorkspace(sessionId: string): WorkspaceState {
  return {
    sessionId,
    mode: "mock",
    phase: "collecting_profile",
    phaseLabel: "正在收集个人信息",
    task: {
      id: "employment-policy-consultation",
      title: "应届毕业生就业政策咨询",
      steps: initialSteps.map((step) => ({ ...step })),
    },
    profile: {},
    documents: [],
    policyMatches: [],
    blocks: [missingEmploymentBlock()],
  };
}

export function applyMockAction(
  current: WorkspaceState,
  action: AgentAction,
): WorkspaceTransition {
  if (action.type === "provide_field") {
    const profile: UserProfile = {
      ...current.profile,
      employmentStatus: action.value as UserProfile["employmentStatus"],
    };
    const state: WorkspaceState = {
      ...current,
      phase: "waiting_for_policy_search",
      phaseLabel: "等待政策检索能力接入",
      profile,
      task: {
        ...current.task,
        steps: current.task.steps.map((step) => {
          if (step.id === "profile") return { ...step, status: "done" };
          if (step.id === "search") {
            return { ...step, status: "blocked", note: "政策库待接入" };
          }
          return step;
        }),
      },
      blocks: [profileBlock(profile), fileRequestBlock()],
    };
    return {
      state,
      chatMessage: `我的就业状态是：${action.label}。请继续帮我梳理就业政策咨询需要的信息。`,
    };
  }

  const document: AgentDocument = {
    id: action.id,
    name: action.fileName,
    size: action.fileSize,
    status: "selected",
    isMock: true,
  };
  const matches = [policyPreview()];
  const state: WorkspaceState = {
    ...current,
    documents: [document],
    policyMatches: matches,
    blocks: [
      profileBlock(current.profile),
      fileRequestBlock(document),
      { id: "policy-preview", type: "policy_matches", title: "政策结果组件预览", matches },
    ],
  };
  return {
    state,
    chatMessage: `我已选择文件“${action.fileName}”。当前只是界面演示，文件没有上传或解析。`,
  };
}
