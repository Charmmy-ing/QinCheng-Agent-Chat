from __future__ import annotations

from app.models.chat import ChatData, ChatRequest
from app.services.llm.base import LLMMessage, LLMProvider
from app.stores.session_store import InMemorySessionStore


SYSTEM_PROMPT = """你是面向应届毕业生的就业创业政策对话助手。
你的服务范围是应届毕业生就业与创业相关政策，包括就业补贴、求职创业补贴、基层就业、灵活就业、社会保险补贴、创业补贴、创业担保贷款和创业场地支持等。
优先了解用户所在地区、毕业年份、学历、就业状态、创业情况和具体诉求；信息不足时，每次只追问一到两个最关键的问题。
用户询问其他主题时，简短说明服务范围，并引导回就业创业政策问题。
当前阶段只负责清晰、友好、专业的多轮对话，不调用政策库、Agent、RAG 或业务工具，不得声称已经检索政策、判断资格、调用工具或完成材料审核。
涉及具体地区、金额、期限、资格条件等可能变化的信息时，必须说明当前回答未经政策知识库核验，并建议以当地人社部门、政务服务平台或后续接入的官方政策检索结果为准。
默认使用简体中文回答，表达直接、简洁，可使用 Markdown。"""


class ChatService:
    def __init__(self, provider: LLMProvider, store: InMemorySessionStore) -> None:
        self._provider = provider
        self._store = store

    async def chat(self, request: ChatRequest) -> ChatData:
        user_message = request.message.strip()
        history = await self._store.get_messages(request.sessionId, request.userId)
        messages: list[LLMMessage] = [
            {"role": "system", "content": SYSTEM_PROMPT},
            *history,
            {"role": "user", "content": user_message},
        ]
        reply = await self._provider.complete(messages)
        await self._store.append_exchange(
            request.sessionId, request.userId, user_message, reply
        )

        return ChatData(
            sessionId=request.sessionId,
            replyText=reply,
            needFollowUp=False,
            followUpQuestions=[],
            userProfile=request.userProfile,
            policies=[],
            eligibility=[],
            plan=None,
            materialResults=[],
        )
