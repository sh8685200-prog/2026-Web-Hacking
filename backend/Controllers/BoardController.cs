using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project.Data;
using Project.Models.Entities;
using System;
using System.Linq;
using System.Net;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace Project.Controllers
{
    /// <summary>
    /// 팬톡 게시판 CRUD API.
    /// OWASP Top 10 기준 보안 적용:
    /// - A01: 수정/삭제 시 JWT UserId vs 게시글 UserId 인가 검증
    /// - A03: HTML 인코딩(Sanitization)으로 Stored XSS 방어
    /// - A04: 입력 길이 제한으로 Insecure Design 방어
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class BoardController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<BoardController> _logger;

        public BoardController(AppDbContext context, ILogger<BoardController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // ═══════════════════════════════════════════════════════
        // DTO 클래스
        // ═══════════════════════════════════════════════════════

        public class CreateBoardDto
        {
            public int ArtistId { get; set; }
            public string Title { get; set; } = string.Empty;
            public string Content { get; set; } = string.Empty;
        }

        public class UpdateBoardDto
        {
            public string Title { get; set; } = string.Empty;
            public string Content { get; set; } = string.Empty;
        }

        public class CreateCommentDto
        {
            public string Content { get; set; } = string.Empty;
        }

        // ═══════════════════════════════════════════════════════
        // 헬퍼: JWT에서 현재 유저 ID 추출
        // ═══════════════════════════════════════════════════════

        private int GetCurrentUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(claim, out int id) ? id : 0;
        }

        private string GetCurrentUserRole()
        {
            return User.FindFirstValue(ClaimTypes.Role) ?? "User";
        }

        // ═══════════════════════════════════════════════════════
        // [A03 방어] HTML Sanitization 헬퍼
        // 사용자 입력에서 <script>, <img onerror> 등 XSS 벡터를 무력화.
        // System.Net.WebUtility.HtmlEncode를 사용하여 서버 측에서 인코딩.
        // ═══════════════════════════════════════════════════════

        /// <summary>
        /// [보안] 사용자 입력 문자열의 HTML 특수문자를 인코딩합니다.
        /// &lt;script&gt;alert('xss')&lt;/script&gt; → &amp;lt;script&amp;gt;alert('xss')&amp;lt;/script&amp;gt;
        /// 이로써 Stored XSS 공격을 원천 차단합니다.
        /// </summary>
        private static string SanitizeInput(string input)
        {
            if (string.IsNullOrWhiteSpace(input)) return string.Empty;
            return WebUtility.HtmlEncode(input.Trim());
        }

        // ═══════════════════════════════════════════════════════
        // [1] 게시글 목록 조회 (특정 아티스트)
        // ═══════════════════════════════════════════════════════

        [HttpGet("artist/{artistId}")]
        [AllowAnonymous] // 비로그인도 조회 가능
        public async Task<IActionResult> GetBoardsByArtist(int artistId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            pageSize = Math.Clamp(pageSize, 1, 50);
            page = Math.Max(1, page);

            var currentUserId = GetCurrentUserId(); // 0이면 비로그인

            var totalCount = await _context.Boards.CountAsync(b => b.ArtistId == artistId);

            var boards = await _context.Boards
                .Where(b => b.ArtistId == artistId)
                .Include(b => b.User)
                .Include(b => b.Comments)
                .OrderByDescending(b => b.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(b => new
                {
                    b.Id,
                    b.Title,
                    b.Content,
                    b.CreatedAt,
                    b.UpdatedAt,
                    AuthorId = b.UserId,
                    AuthorName = b.User.Nickname ?? b.User.Name,
                    CommentCount = b.Comments.Count,
                    // [A01] 프론트에서 수정/삭제 버튼 조건부 렌더링용
                    IsOwner = b.UserId == currentUserId
                })
                .ToListAsync();

            return Ok(new { TotalCount = totalCount, Page = page, PageSize = pageSize, Posts = boards });
        }

        // ═══════════════════════════════════════════════════════
        // [2] 게시글 작성 (CREATE)
        // ═══════════════════════════════════════════════════════

        [HttpPost]
        public async Task<IActionResult> CreatePost([FromBody] CreateBoardDto dto)
        {
            var userId = GetCurrentUserId();
            if (userId == 0) return Unauthorized(new { Message = "인증이 필요합니다." });

            // [A04] 입력 유효성 검사
            if (string.IsNullOrWhiteSpace(dto.Title) || dto.Title.Length > 200)
                return BadRequest(new { Message = "제목은 1~200자 이내여야 합니다." });
            if (string.IsNullOrWhiteSpace(dto.Content) || dto.Content.Length > 5000)
                return BadRequest(new { Message = "내용은 1~5000자 이내여야 합니다." });

            // 아티스트 존재 확인
            var artistExists = await _context.Artists.AnyAsync(a => a.Id == dto.ArtistId);
            if (!artistExists)
                return NotFound(new { Message = "아티스트를 찾을 수 없습니다." });

            var newPost = new Board
            {
                ArtistId = dto.ArtistId,
                UserId = userId,
                // [A03 방어] HTML 인코딩으로 XSS 방어
                Title = SanitizeInput(dto.Title),
                Content = SanitizeInput(dto.Content),
                CreatedAt = DateTime.UtcNow
            };

            _context.Boards.Add(newPost);
            await _context.SaveChangesAsync();

            _logger.LogInformation("[보안 로그] 유저 {UserId}가 아티스트 {ArtistId} 팬톡에 게시글 {PostId}을 작성함", userId, dto.ArtistId, newPost.Id);

            return Ok(new
            {
                Message = "게시글이 등록되었습니다.",
                Post = new
                {
                    newPost.Id,
                    newPost.Title,
                    newPost.Content,
                    newPost.CreatedAt,
                    AuthorId = userId,
                    IsOwner = true
                }
            });
        }

        // ═══════════════════════════════════════════════════════
        // [3] 게시글 수정 (UPDATE) — A01 인가 검증 필수
        // ═══════════════════════════════════════════════════════

        /// <summary>
        /// [A01 접근 제어 오류 방어]
        /// JWT 토큰의 UserId와 게시글 작성자의 UserId를 비교하여
        /// 본인 또는 Admin만 수정 가능하도록 합니다.
        /// 타인의 게시글 수정 시도 시 403 Forbidden 반환 + 보안 로그 기록.
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePost(int id, [FromBody] UpdateBoardDto dto)
        {
            var userId = GetCurrentUserId();
            if (userId == 0) return Unauthorized(new { Message = "인증이 필요합니다." });

            var post = await _context.Boards.FindAsync(id);
            if (post == null) return NotFound(new { Message = "게시글을 찾을 수 없습니다." });

            // ── [A01] 인가 검증: 작성자 본인 또는 Admin만 수정 가능 ──
            if (post.UserId != userId && GetCurrentUserRole() != "Admin")
            {
                _logger.LogWarning(
                    "[보안 경고] 인가 위반: 유저 {AttackerId}가 유저 {OwnerId}의 게시글 {PostId} 수정 시도",
                    userId, post.UserId, id);
                return StatusCode(403, new { Message = "본인이 작성한 글만 수정할 수 있습니다." });
            }

            // [A04] 입력 유효성 검사
            if (string.IsNullOrWhiteSpace(dto.Title) || dto.Title.Length > 200)
                return BadRequest(new { Message = "제목은 1~200자 이내여야 합니다." });
            if (string.IsNullOrWhiteSpace(dto.Content) || dto.Content.Length > 5000)
                return BadRequest(new { Message = "내용은 1~5000자 이내여야 합니다." });

            // [A03 방어] HTML 인코딩
            post.Title = SanitizeInput(dto.Title);
            post.Content = SanitizeInput(dto.Content);
            post.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("[보안 로그] 유저 {UserId}가 게시글 {PostId}을 수정함", userId, id);

            return Ok(new { Message = "게시글이 수정되었습니다." });
        }

        // ═══════════════════════════════════════════════════════
        // [4] 게시글 삭제 (DELETE) — A01 인가 검증 필수
        // ═══════════════════════════════════════════════════════

        /// <summary>
        /// [A01 접근 제어 오류 방어]
        /// JWT 토큰의 UserId와 게시글 작성자의 UserId를 비교합니다.
        /// Admin은 모든 게시글 삭제 가능 (관리 목적).
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePost(int id)
        {
            var userId = GetCurrentUserId();
            if (userId == 0) return Unauthorized(new { Message = "인증이 필요합니다." });

            var post = await _context.Boards.FindAsync(id);
            if (post == null) return NotFound(new { Message = "게시글을 찾을 수 없습니다." });

            // ── [A01] 인가 검증 ──
            if (post.UserId != userId && GetCurrentUserRole() != "Admin")
            {
                _logger.LogWarning(
                    "[보안 경고] 인가 위반: 유저 {AttackerId}가 유저 {OwnerId}의 게시글 {PostId} 삭제 시도",
                    userId, post.UserId, id);
                return StatusCode(403, new { Message = "본인이 작성한 글만 삭제할 수 있습니다." });
            }

            _context.Boards.Remove(post);
            await _context.SaveChangesAsync();

            _logger.LogInformation("[보안 로그] 유저 {UserId}가 게시글 {PostId}을 삭제함", userId, id);

            return Ok(new { Message = "게시글이 삭제되었습니다." });
        }

        // ═══════════════════════════════════════════════════════
        // [5] 댓글 목록 조회
        // ═══════════════════════════════════════════════════════

        [HttpGet("{boardId}/comments")]
        [AllowAnonymous]
        public async Task<IActionResult> GetComments(int boardId)
        {
            var currentUserId = GetCurrentUserId();

            var comments = await _context.Comments
                .Where(c => c.BoardId == boardId)
                .Include(c => c.User)
                .OrderBy(c => c.CreatedAt)
                .Select(c => new
                {
                    c.Id,
                    c.Content,
                    c.CreatedAt,
                    AuthorId = c.UserId,
                    AuthorName = c.User.Nickname ?? c.User.Name,
                    IsOwner = c.UserId == currentUserId
                })
                .ToListAsync();

            return Ok(comments);
        }

        // ═══════════════════════════════════════════════════════
        // [6] 댓글 작성
        // ═══════════════════════════════════════════════════════

        [HttpPost("{boardId}/comments")]
        public async Task<IActionResult> CreateComment(int boardId, [FromBody] CreateCommentDto dto)
        {
            var userId = GetCurrentUserId();
            if (userId == 0) return Unauthorized(new { Message = "인증이 필요합니다." });

            if (string.IsNullOrWhiteSpace(dto.Content) || dto.Content.Length > 2000)
                return BadRequest(new { Message = "댓글은 1~2000자 이내여야 합니다." });

            var boardExists = await _context.Boards.AnyAsync(b => b.Id == boardId);
            if (!boardExists)
                return NotFound(new { Message = "게시글을 찾을 수 없습니다." });

            var comment = new Comment
            {
                BoardId = boardId,
                UserId = userId,
                // [A03 방어] HTML 인코딩
                Content = SanitizeInput(dto.Content),
                CreatedAt = DateTime.UtcNow
            };

            _context.Comments.Add(comment);
            await _context.SaveChangesAsync();

            _logger.LogInformation("[보안 로그] 유저 {UserId}가 게시글 {BoardId}에 댓글 {CommentId}을 작성함", userId, boardId, comment.Id);

            return Ok(new
            {
                Message = "댓글이 등록되었습니다.",
                Comment = new
                {
                    comment.Id,
                    comment.Content,
                    comment.CreatedAt,
                    AuthorId = userId,
                    IsOwner = true
                }
            });
        }

        // ═══════════════════════════════════════════════════════
        // [7] 댓글 삭제 — A01 인가 검증
        // ═══════════════════════════════════════════════════════

        [HttpDelete("comments/{commentId}")]
        public async Task<IActionResult> DeleteComment(int commentId)
        {
            var userId = GetCurrentUserId();
            if (userId == 0) return Unauthorized(new { Message = "인증이 필요합니다." });

            var comment = await _context.Comments.FindAsync(commentId);
            if (comment == null) return NotFound(new { Message = "댓글을 찾을 수 없습니다." });

            // [A01] 인가 검증
            if (comment.UserId != userId && GetCurrentUserRole() != "Admin")
            {
                _logger.LogWarning("[보안 경고] 인가 위반: 유저 {AttackerId}가 댓글 {CommentId} 삭제 시도", userId, commentId);
                return StatusCode(403, new { Message = "본인이 작성한 댓글만 삭제할 수 있습니다." });
            }

            _context.Comments.Remove(comment);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "댓글이 삭제되었습니다." });
        }
    }
}
