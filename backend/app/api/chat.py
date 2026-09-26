from __future__ import annotations

import uuid

from fastapi import APIRouter, Header, Request

from app.models.chat import ApiResponse, ChatData, ChatRequest

router = APIRouter(prefix="/api", tags=["Chat"])


def resolve_trace_id(value: str | None) -> str:
    if value:
        cleaned = value.strip()[:128]
        if cleaned:
            return cleaned
    return uuid.uuid4().hex


@router.post("/agent/chat", response_model=ApiResponse[ChatData])
async def chat(
    payload: ChatRequest,
    request: Request,
    x_trace_id: str | None = Header(default=None, alias="X-Trace-Id"),
) -> ApiResponse[ChatData]:
    trace_id = resolve_trace_id(x_trace_id)
    request.state.trace_id = trace_id
    data = await request.app.state.chat_service.chat(payload)
    return ApiResponse(code=0, message="success", traceId=trace_id, data=data)


@router.get("/health")
async def health(request: Request) -> dict:
    settings = request.app.state.settings
    provider = request.app.state.llm_provider
    return {
        "status": "ok",
        "module": "chat",
        "llmConfigured": settings.llm_configured,
        "provider": provider.name,
        "model": settings.llm_model,
    }

