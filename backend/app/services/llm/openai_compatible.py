from __future__ import annotations

import logging

from openai import (
    APIConnectionError,
    APIError,
    APITimeoutError,
    AsyncOpenAI,
    AuthenticationError,
    RateLimitError,
)

from app.core.config import Settings
from app.core.errors import LLMServiceError, LLMTimeoutError
from app.services.llm.base import LLMMessage, LLMProvider

logger = logging.getLogger(__name__)


class OpenAICompatibleProvider(LLMProvider):
    def __init__(self, settings: Settings) -> None:
        self._model = settings.llm_model
        self._temperature = settings.llm_temperature
        self._max_tokens = settings.llm_max_tokens
        self._client = AsyncOpenAI(
            api_key=settings.llm_api_key,
            base_url=settings.llm_base_url,
            timeout=settings.llm_timeout_seconds,
            max_retries=1,
        )

    @property
    def name(self) -> str:
        return "openai-compatible"

    async def complete(self, messages: list[LLMMessage]) -> str:
        try:
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=messages,
                temperature=self._temperature,
                max_tokens=self._max_tokens,
            )
        except APITimeoutError as exc:
            logger.warning("LLM request timed out")
            raise LLMTimeoutError() from exc
        except AuthenticationError as exc:
            logger.error("LLM authentication failed")
            raise LLMServiceError("模型服务认证失败，请检查后端 API Key 配置") from exc
        except RateLimitError as exc:
            logger.warning("LLM rate limit reached")
            raise LLMServiceError("模型服务请求过于频繁，请稍后重试") from exc
        except (APIConnectionError, APIError) as exc:
            logger.warning("LLM provider request failed: %s", type(exc).__name__)
            raise LLMServiceError() from exc
        except Exception as exc:
            logger.exception("Unexpected LLM provider error")
            raise LLMServiceError() from exc

        content = response.choices[0].message.content if response.choices else None
        if not content or not content.strip():
            raise LLMServiceError("模型服务返回了空内容，请重新发送")
        return content.strip()

