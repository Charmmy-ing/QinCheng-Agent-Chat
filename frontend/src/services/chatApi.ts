import type { ApiResponse, ChatData, ChatRequest } from "../types/chat";

export class ChatApiError extends Error {
  constructor(
    message: string,
    readonly traceId?: string,
  ) {
    super(message);
    this.name = "ChatApiError";
  }
}

function createTraceId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function sendChatMessage(
  payload: ChatRequest,
  signal?: AbortSignal,
): Promise<ChatData> {
  const fallbackTraceId = createTraceId();
  let response: Response;

  try {
    response = await fetch("/api/agent/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Trace-Id": fallbackTraceId,
      },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new ChatApiError("无法连接对话服务，请检查服务是否已启动", fallbackTraceId);
  }

  let body: ApiResponse<ChatData>;
  try {
    body = (await response.json()) as ApiResponse<ChatData>;
  } catch {
    throw new ChatApiError("服务返回了无法识别的响应", fallbackTraceId);
  }

  if (!response.ok || body.code !== 0 || !body.data) {
    throw new ChatApiError(body.message || "请求失败，请稍后重试", body.traceId);
  }
  return body.data;
}
