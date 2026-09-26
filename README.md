# 应届毕业生就业创业政策 Agent - 第一阶段 Chat

本目录是独立重写的第一阶段实现，只负责“用户与 LLM 对话”。原 MVP 位于上级目录，本模块不依赖其代码。

## 目录

- `frontend/`：Vue 3 + TypeScript + Vite 对话界面
- `backend/`：FastAPI Chat API、会话上下文和 LLM Provider
- `Chat 模块接口规范.md`：接口调用说明
- `后续开发对接说明.md`：Agent、RAG、Tool 后续接入位置

## 本地启动

### 1. 配置后端

```powershell
cd backend
Copy-Item .env.example .env
```

编辑 `.env`，至少填写：

```dotenv
LLM_API_KEY=你的模型服务密钥
```

默认使用移动云的 OpenAI 兼容接口和 `deepseek-v4-flash-0731` 模型。更换服务时修改 `LLM_BASE_URL` 和 `LLM_MODEL`，不需要改业务代码。

### 2. 安装并构建前端

```powershell
cd frontend
npm install
npm run build
```

### 3. 启动完整应用

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements-dev.txt
.\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

浏览器访问 `http://127.0.0.1:8000/`。开发前端时可以在 `frontend/` 运行 `npm run dev`，访问 `http://127.0.0.1:5173/`。

## 验证

```powershell
cd backend
.\.venv\Scripts\python -m pytest
.\.venv\Scripts\python scripts\smoke_real_llm.py

cd ..\frontend
npm run typecheck
npm run build
```

`smoke_real_llm.py` 会通过已启动的 Chat API 发起一次真实模型请求，不读取或输出 API Key。
