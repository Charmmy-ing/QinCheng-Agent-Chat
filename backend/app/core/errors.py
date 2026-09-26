class AppError(Exception):
    def __init__(self, code: int, message: str, http_status: int) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.http_status = http_status


class InvalidRequestError(AppError):
    def __init__(self, message: str = "请求参数缺失或格式错误") -> None:
        super().__init__(1001, message, 400)


class LLMServiceError(AppError):
    def __init__(self, message: str = "模型服务暂时不可用，请稍后重试") -> None:
        super().__init__(5001, message, 500)


class LLMTimeoutError(AppError):
    def __init__(self, message: str = "模型服务响应超时，请稍后重试") -> None:
        super().__init__(5002, message, 504)

