from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from typing import Literal, TypedDict


class LLMMessage(TypedDict):
    role: Literal["system", "user", "assistant"]
    content: str


class LLMProvider(ABC):
    @abstractmethod
    async def complete(self, messages: list[LLMMessage]) -> str:
        """Return one assistant reply for the supplied conversation."""

    async def stream(self, messages: list[LLMMessage]) -> AsyncIterator[str]:
        """Yield reply chunks. Providers without streaming support use one chunk."""
        yield await self.complete(messages)

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable provider name for health checks."""


class UnavailableLLMProvider(LLMProvider):
    @property
    def name(self) -> str:
        return "not-configured"

    async def complete(self, messages: list[LLMMessage]) -> str:
        from app.core.errors import LLMServiceError

        raise LLMServiceError("模型服务尚未配置，请在后端 .env 中设置 LLM_API_KEY")
