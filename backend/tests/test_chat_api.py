from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.errors import LLMTimeoutError
from app.main import create_app
from app.services.llm.base import LLMMessage, LLMProvider


class RecordingProvider(LLMProvider):
    def __init__(self, replies: list[str] | None = None) -> None:
        self.replies = replies or ["你好，我可以和你一起梳理问题。"]
        self.calls: list[list[LLMMessage]] = []

    @property
    def name(self) -> str:
        return "recording-test-provider"

    async def complete(self, messages: list[LLMMessage]) -> str:
        self.calls.append([message.copy() for message in messages])
        return self.replies[min(len(self.calls) - 1, len(self.replies) - 1)]


class TimeoutProvider(LLMProvider):
    @property
    def name(self) -> str:
        return "timeout-test-provider"

    async def complete(self, messages: list[LLMMessage]) -> str:
        raise LLMTimeoutError()


def settings() -> Settings:
    return Settings(
        llm_base_url="https://example.invalid/v1",
        llm_api_key="test-key",
        llm_model="test-model",
        llm_timeout_seconds=1,
        llm_max_tokens=256,
        llm_temperature=0.2,
        cors_origins=("http://localhost:5173",),
        session_history_limit=40,
        session_limit=100,
    )


def payload(message: str = "你好") -> dict:
    return {
        "sessionId": "session-12345678",
        "userId": "user-1",
        "message": message,
        "userProfile": {"city": "杭州", "education": "本科"},
    }


def test_chat_returns_formal_contract_and_trace_id() -> None:
    provider = RecordingProvider()
    client = TestClient(create_app(settings(), provider))

    response = client.post(
        "/api/agent/chat",
        json=payload(),
        headers={"X-Trace-Id": "trace-from-client"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["code"] == 0
    assert body["message"] == "success"
    assert body["traceId"] == "trace-from-client"
    assert body["data"] == {
        "sessionId": "session-12345678",
        "replyText": "你好，我可以和你一起梳理问题。",
        "needFollowUp": False,
        "followUpQuestions": [],
        "userProfile": {
            "userId": None,
            "city": "杭州",
            "education": "本科",
            "graduationYear": None,
            "employmentStatus": None,
            "isFirstTimeEntrepreneur": None,
            "enterpriseRegisterDate": None,
            "socialInsuranceMonths": None,
            "housingStatus": None,
            "fields": [],
        },
        "policies": [],
        "eligibility": [],
        "plan": None,
        "materialResults": [],
    }


def test_second_turn_sends_server_side_history_to_provider() -> None:
    provider = RecordingProvider(["第一轮回答", "第二轮回答"])
    client = TestClient(create_app(settings(), provider))

    assert client.post("/api/agent/chat", json=payload("第一轮问题")).status_code == 200
    assert client.post("/api/agent/chat", json=payload("那第二步呢？")).status_code == 200

    assert [(item["role"], item["content"]) for item in provider.calls[1][1:]] == [
        ("user", "第一轮问题"),
        ("assistant", "第一轮回答"),
        ("user", "那第二步呢？"),
    ]


def test_invalid_request_uses_error_contract() -> None:
    provider = RecordingProvider()
    client = TestClient(create_app(settings(), provider))
    bad_payload = payload()
    del bad_payload["message"]

    response = client.post("/api/agent/chat", json=bad_payload)

    assert response.status_code == 400
    assert response.json()["code"] == 1001
    assert response.json()["data"] is None
    assert response.json()["traceId"]


def test_session_cannot_be_reused_by_another_user() -> None:
    provider = RecordingProvider()
    client = TestClient(create_app(settings(), provider))
    assert client.post("/api/agent/chat", json=payload()).status_code == 200
    other_user = payload("继续")
    other_user["userId"] = "user-2"

    response = client.post("/api/agent/chat", json=other_user)

    assert response.status_code == 400
    assert response.json()["code"] == 1001


def test_llm_timeout_uses_error_code_5002() -> None:
    client = TestClient(create_app(settings(), TimeoutProvider()))

    response = client.post("/api/agent/chat", json=payload())

    assert response.status_code == 504
    assert response.json()["code"] == 5002
    assert response.json()["data"] is None


def test_health_never_exposes_api_key() -> None:
    provider = RecordingProvider()
    client = TestClient(create_app(settings(), provider))

    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["llmConfigured"] is True
    assert "key" not in response.text.lower()
    assert "test-key" not in response.text
