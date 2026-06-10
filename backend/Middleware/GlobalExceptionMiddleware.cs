using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System;
using System.Text.Json;
using System.Threading.Tasks;

namespace Project.Middleware
{
    /// <summary>
    /// [A09] 전역 예외 처리 + 보안 감사 로그 미들웨어.
    /// 1) 미처리 예외: Client IP, Path, User 정보를 포함하여 Error 레벨로 로깅.
    /// 2) 401 Unauthorized: 인증되지 않은 접근 시도를 Warning 레벨로 기록.
    /// 3) 403 Forbidden: 권한 없는 접근 시도를 Warning 레벨로 기록.
    /// </summary>
    public class GlobalExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionMiddleware> _logger;

        public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext httpContext)
        {
            try
            {
                await _next(httpContext);

                // ── 응답 완료 후 보안 감사 로그 ──
                var statusCode = httpContext.Response.StatusCode;
                var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                var path = httpContext.Request.Path.ToString();
                var method = httpContext.Request.Method;
                var user = httpContext.User.Identity?.Name ?? "Anonymous";

                if (statusCode == StatusCodes.Status401Unauthorized)
                {
                    _logger.LogWarning(
                        "[보안 감사] 401 인증 실패 — IP: {ClientIP}, Method: {Method}, Path: {Path}, User: {User}",
                        clientIp, method, path, user);
                }
                else if (statusCode == StatusCodes.Status403Forbidden)
                {
                    _logger.LogWarning(
                        "[보안 감사] 403 권한 거부 — IP: {ClientIP}, Method: {Method}, Path: {Path}, User: {User}",
                        clientIp, method, path, user);
                }
            }
            catch (Exception ex)
            {
                var errorId = Guid.NewGuid().ToString(); // A09: 추적용 로그 ID 매핑
                var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

                _logger.LogError(ex, 
                    "[보안 감사] 시스템 에러 — ErrorId: {ErrorId}, IP: {ClientIP}, Path: {Path}, User: {User}", 
                    errorId, clientIp, httpContext.Request.Path, httpContext.User.Identity?.Name ?? "Anonymous");

                await HandleExceptionAsync(httpContext, errorId);
            }
        }

        private static Task HandleExceptionAsync(HttpContext context, string errorId)
        {
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;

            // 절대 클라이언트에게 Exception StackTrace 노출 금지!
            var response = new 
            { 
                Message = "서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", 
                ErrorId = errorId 
            };

            return context.Response.WriteAsync(JsonSerializer.Serialize(response));
        }
    }
}
