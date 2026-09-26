from __future__ import annotations

import json
import sys
import uuid

import httpx


def main() -> int:
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"
    request_body = {
        "sessionId": f"smoke-{uuid.uuid4().hex}",
        "userId": "smoke-test-user",
        "message": "请用一句话说明你当前能提供什么帮助。",
        "userProfile": {},
    }
    response = httpx.post(
        f"{base_url.rstrip('/')}/api/agent/chat",
        json=request_body,
        headers={"X-Trace-Id": f"smoke-{uuid.uuid4().hex}"},
        timeout=60,
    )
    body = response.json()
    if response.status_code != 200 or body.get("code") != 0:
        print(json.dumps(body, ensure_ascii=False, indent=2))
        return 1
    reply = body.get("data", {}).get("replyText", "").strip()
    if not reply:
        print("真实链路测试失败：模型返回内容为空。")
        return 1
    print(f"真实链路测试通过，traceId={body['traceId']}")
    print(f"模型回复：{reply}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
