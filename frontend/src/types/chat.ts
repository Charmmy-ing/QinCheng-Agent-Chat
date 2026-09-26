export interface ProfileField {
  key: string;
  value: string;
  source: "user_stated" | "document_extracted" | "system_inferred";
}

export interface UserProfile {
  userId?: string | null;
  city?: string | null;
  education?: "本科" | "硕士" | "专科" | "其他" | null;
  graduationYear?: number | null;
  employmentStatus?: "待就业" | "已就业" | "创业中" | null;
  isFirstTimeEntrepreneur?: boolean | null;
  enterpriseRegisterDate?: string | null;
  socialInsuranceMonths?: number | null;
  housingStatus?: "租房" | "自有" | "其他" | null;
  fields?: ProfileField[];
}

export interface ChatRequest {
  sessionId: string;
  userId: string;
  message: string;
  userProfile: UserProfile;
}

export interface ChatData {
  sessionId: string;
  replyText: string;
  needFollowUp: boolean;
  followUpQuestions: string[];
  userProfile: UserProfile;
  policies: unknown[];
  eligibility: unknown[];
  plan: unknown | null;
  materialResults: unknown[];
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  traceId: string;
  data: T | null;
}

export interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "sending" | "sent" | "error";
  errorMessage?: string;
}

export interface StoredConversation {
  sessionId: string;
  title: string;
  messages: DisplayMessage[];
}
