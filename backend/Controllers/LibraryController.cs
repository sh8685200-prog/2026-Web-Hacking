using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project.Data;
using Project.Models.Entities;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace Project.Controllers
{
    /// <summary>
    /// 보관함(좋아요) API.
    /// UserLikedTrack 연결 테이블을 통한 N:M 관계 관리.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class LibraryController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<LibraryController> _logger;

        public LibraryController(AppDbContext context, ILogger<LibraryController> logger)
        {
            _context = context;
            _logger = logger;
        }

        private int GetCurrentUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(claim, out int id) ? id : 0;
        }

        // ═══════════════════════════════════════════════════════
        // [1] 좋아요 토글 (좋아요 누르기 / 취소)
        // POST /api/library/like/{trackId}
        // ═══════════════════════════════════════════════════════

        /// <summary>
        /// 특정 곡에 '좋아요'를 누르거나 취소합니다.
        /// 이미 좋아요 상태이면 취소, 아니면 추가 (토글 방식).
        /// </summary>
        [HttpPost("like/{trackId}")]
        public async Task<IActionResult> ToggleLike(int trackId)
        {
            var userId = GetCurrentUserId();
            if (userId == 0) return Unauthorized(new { Message = "인증이 필요합니다." });

            // 트랙 존재 확인
            var trackExists = await _context.Tracks.AnyAsync(t => t.Id == trackId);
            if (!trackExists)
                return NotFound(new { Message = "트랙을 찾을 수 없습니다." });

            var existingLike = await _context.UserLikedTracks
                .FirstOrDefaultAsync(ult => ult.UserId == userId && ult.TrackId == trackId);

            bool isLiked;

            if (existingLike != null)
            {
                // 이미 좋아요 → 취소
                _context.UserLikedTracks.Remove(existingLike);
                isLiked = false;
                _logger.LogInformation("[보관함] 유저 {UserId}가 트랙 {TrackId} 좋아요 취소", userId, trackId);
            }
            else
            {
                // 좋아요 추가
                _context.UserLikedTracks.Add(new UserLikedTrack
                {
                    UserId = userId,
                    TrackId = trackId,
                    LikedAt = DateTime.UtcNow
                });
                isLiked = true;
                _logger.LogInformation("[보관함] 유저 {UserId}가 트랙 {TrackId} 좋아요", userId, trackId);
            }

            await _context.SaveChangesAsync();

            return Ok(new { IsLiked = isLiked, TrackId = trackId });
        }

        // ═══════════════════════════════════════════════════════
        // [2] 좋아요 상태 확인 (단일 트랙)
        // GET /api/library/is-liked/{trackId}
        // ═══════════════════════════════════════════════════════

        [HttpGet("is-liked/{trackId}")]
        public async Task<IActionResult> IsLiked(int trackId)
        {
            var userId = GetCurrentUserId();
            if (userId == 0) return Ok(new { IsLiked = false });

            var liked = await _context.UserLikedTracks
                .AnyAsync(ult => ult.UserId == userId && ult.TrackId == trackId);

            return Ok(new { IsLiked = liked, TrackId = trackId });
        }

        // ═══════════════════════════════════════════════════════
        // [3] 좋아요 한 곡 목록 (보관함)
        // GET /api/library/liked-tracks
        // ═══════════════════════════════════════════════════════

        /// <summary>
        /// 현재 로그인한 유저가 좋아요 한 곡들을 최신순으로 반환합니다.
        /// </summary>
        [HttpGet("liked-tracks")]
        public async Task<IActionResult> GetLikedTracks([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            var userId = GetCurrentUserId();
            if (userId == 0) return Unauthorized(new { Message = "인증이 필요합니다." });

            pageSize = Math.Clamp(pageSize, 1, 100);
            page = Math.Max(1, page);

            var totalCount = await _context.UserLikedTracks.CountAsync(ult => ult.UserId == userId);

            var likedTracks = await _context.UserLikedTracks
                .Where(ult => ult.UserId == userId)
                .OrderByDescending(ult => ult.LikedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Include(ult => ult.Track)
                    .ThenInclude(t => t.Album)
                        .ThenInclude(a => a.Artist)
                .Select(ult => new
                {
                    ult.Track.Id,
                    ult.Track.Title,
                    ult.Track.Duration,
                    ult.Track.TrackNumber,
                    Album = new { ult.Track.Album.Id, ult.Track.Album.Title, ult.Track.Album.CoverImageUrl },
                    Artist = new { ult.Track.Album.Artist.Id, ult.Track.Album.Artist.Name },
                    LikedAt = ult.LikedAt,
                    IsLiked = true
                })
                .ToListAsync();

            return Ok(new { TotalCount = totalCount, Page = page, PageSize = pageSize, Tracks = likedTracks });
        }

        // ═══════════════════════════════════════════════════════
        // [4] 여러 트랙의 좋아요 상태 일괄 조회
        // POST /api/library/check-likes
        // ═══════════════════════════════════════════════════════

        public class CheckLikesDto
        {
            public int[] TrackIds { get; set; } = Array.Empty<int>();
        }

        [HttpPost("check-likes")]
        public async Task<IActionResult> CheckLikes([FromBody] CheckLikesDto dto)
        {
            var userId = GetCurrentUserId();
            if (userId == 0) return Ok(new { LikedTrackIds = Array.Empty<int>() });

            if (dto.TrackIds.Length > 100)
                return BadRequest(new { Message = "한 번에 최대 100개까지 조회 가능합니다." });

            var likedIds = await _context.UserLikedTracks
                .Where(ult => ult.UserId == userId && dto.TrackIds.Contains(ult.TrackId))
                .Select(ult => ult.TrackId)
                .ToListAsync();

            return Ok(new { LikedTrackIds = likedIds });
        }
    }
}
