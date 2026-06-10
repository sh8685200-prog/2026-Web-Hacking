using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Hosting;
using Project.Services;
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace Project.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    // [보안] 오직 Admin 역할을 가진 유저만 접근 가능
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly ISpotifySyncService _spotifySyncService;
        private readonly ILogger<AdminController> _logger;
        private readonly IWebHostEnvironment _env;

        public AdminController(ISpotifySyncService spotifySyncService, ILogger<AdminController> logger, IWebHostEnvironment env)
        {
            _spotifySyncService = spotifySyncService;
            _logger = logger;
            _env = env;
        }

        public class SyncRequestDto
        {
            public string Query { get; set; } = "K-Pop";
            public int Limit { get; set; } = 50;
        }

        [HttpPost("sync-spotify")]
        public async Task<IActionResult> SyncSpotify([FromBody] SyncRequestDto dto)
        {
            _logger.LogInformation("[Admin] Spotify 동기화 요청: Query={query}, Limit={limit}", dto.Query, dto.Limit);

            try
            {
                int count = await _spotifySyncService.SyncSpotifyDataAsync(dto.Query, dto.Limit);
                return Ok(new { Message = "Spotify 동기화가 성공적으로 완료되었습니다.", ImportedCount = count });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Spotify 동기화 중 오류 발생");
                return StatusCode(500, new { Message = "동기화 중 서버 오류가 발생했습니다." });
            }
        }

        /// <summary>
        /// [A09] 보안 감사 로그 다운로드 엔드포인트.
        /// 관리자만 접근 가능하며, Logs 폴더에서 가장 최신 로그 파일을 반환합니다.
        /// 
        /// 보안 조치:
        /// 1. [Authorize(Roles = "Admin")] — 관리자 전용 접근 제어.
        /// 2. 로그 디렉토리 경로를 하드코딩하여 Path Traversal 공격을 원천 차단.
        /// 3. 파일 확장자를 .txt로 제한하여 임의 파일 다운로드 방지.
        /// </summary>
        [HttpGet("logs/download")]
        public IActionResult DownloadLatestLog()
        {
            var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var adminUser = User.Identity?.Name ?? "Unknown Admin";

            _logger.LogInformation(
                "[보안 감사] 로그 다운로드 요청 — Admin: {Admin}, IP: {ClientIP}",
                adminUser, clientIp);

            try
            {
                // ContentRootPath = backend/ 디렉토리 (dotnet run 실행 위치)
                // 기존 logs/ 폴더와 새 Logs/ 폴더 모두 검색
                var logsDirectory = Path.Combine(_env.ContentRootPath, "Logs");
                var legacyLogsDirectory = Path.Combine(_env.ContentRootPath, "logs");
                var normalizedPath = Directory.Exists(logsDirectory) 
                    ? Path.GetFullPath(logsDirectory) 
                    : Path.GetFullPath(legacyLogsDirectory);

                if (!Directory.Exists(normalizedPath))
                {
                    _logger.LogWarning("[보안 감사] 로그 디렉토리가 존재하지 않음 — Path: {Path}", normalizedPath);
                    return NotFound(new { Message = "로그 디렉토리가 존재하지 않습니다." });
                }

                // 가장 최신 .txt 로그 파일 검색
                var latestLogFile = Directory.GetFiles(normalizedPath, "security-log-*.txt")
                    .Select(f => new FileInfo(f))
                    .OrderByDescending(fi => fi.LastWriteTimeUtc)
                    .FirstOrDefault();

                if (latestLogFile == null || !latestLogFile.Exists)
                {
                    _logger.LogWarning("[보안 감사] 다운로드할 로그 파일이 없음 — Directory: {Dir}", normalizedPath);
                    return NotFound(new { Message = "다운로드할 로그 파일이 없습니다." });
                }

                // Path Traversal 방어: 파일이 반드시 Logs 폴더 내에 있는지 검증
                if (!latestLogFile.FullName.StartsWith(normalizedPath, StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogError(
                        "[보안 감사] Path Traversal 시도 감지! — Admin: {Admin}, IP: {ClientIP}, AttemptedPath: {Path}",
                        adminUser, clientIp, latestLogFile.FullName);
                    return StatusCode(403, new { Message = "잘못된 파일 경로입니다." });
                }

                _logger.LogInformation(
                    "[보안 감사] 로그 다운로드 성공 — Admin: {Admin}, IP: {ClientIP}, File: {FileName}, Size: {Size}bytes",
                    adminUser, clientIp, latestLogFile.Name, latestLogFile.Length);

                // FileShare.ReadWrite: Serilog가 파일에 쓰고 있는 중에도 읽기 가능
                var stream = new FileStream(
                    latestLogFile.FullName, 
                    FileMode.Open, 
                    FileAccess.Read, 
                    FileShare.ReadWrite);

                return File(stream, "application/octet-stream", latestLogFile.Name);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[보안 감사] 로그 다운로드 중 오류 — Admin: {Admin}, IP: {ClientIP}", adminUser, clientIp);
                return StatusCode(500, new { Message = "로그 다운로드 중 오류가 발생했습니다." });
            }
        }
    }
}
