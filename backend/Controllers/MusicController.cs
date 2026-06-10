using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Project.Data;
using Project.Models.Entities;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Project.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MusicController : ControllerBase
    {
        private readonly ILogger<MusicController> _logger;
        private readonly AppDbContext _context;

        // ── 보안: 허용 MIME 타입 화이트리스트 ──
        private static readonly Dictionary<string, byte[]> AllowedAudioTypes = new()
        {
            { "audio/mpeg",  new byte[] { 0xFF, 0xFB } },        // MP3 (MPEG frame sync)
            { "audio/flac",  new byte[] { 0x66, 0x4C, 0x61, 0x43 } }, // FLAC (fLaC)
        };

        // ID3v2 태그 매직 바이트 (MP3 파일이 ID3 태그로 시작하는 경우)
        private static readonly byte[] Id3v2Magic = new byte[] { 0x49, 0x44, 0x33 }; // "ID3"

        private static readonly HashSet<string> AllowedImageTypes = new()
        {
            "image/jpeg", "image/png", "image/webp"
        };

        // 매직 바이트 검증용
        private static readonly Dictionary<string, byte[]> ImageMagicBytes = new()
        {
            { "image/jpeg", new byte[] { 0xFF, 0xD8, 0xFF } },
            { "image/png",  new byte[] { 0x89, 0x50, 0x4E, 0x47 } },
            { "image/webp", new byte[] { 0x52, 0x49, 0x46, 0x46 } }, // RIFF
        };

        // 보안: 파일 크기 제한 (100MB 오디오, 10MB 이미지)
        private const long MaxAudioSize = 100 * 1024 * 1024;
        private const long MaxImageSize = 10 * 1024 * 1024;

        private readonly IHttpClientFactory _httpClientFactory;

        public MusicController(ILogger<MusicController> logger, AppDbContext context, IHttpClientFactory httpClientFactory)
        {
            _logger = logger;
            _context = context;
            _httpClientFactory = httpClientFactory;
        }

        // ═══════════════════════════════════════════════════════
        // DTO 클래스
        // ═══════════════════════════════════════════════════════

        public class ArtistCreateDto
        {
            public string Name { get; set; } = string.Empty;
            public string? Bio { get; set; }
        }

        public class AlbumCreateDto
        {
            public int ArtistId { get; set; }
            public string Title { get; set; } = string.Empty;
            public DateTime? ReleaseDate { get; set; }
        }

        // ═══════════════════════════════════════════════════════
        // [1] 아티스트 관리 API
        // ═══════════════════════════════════════════════════════

        /// <summary>
        /// 아티스트 등록 (Admin 전용).
        /// 프로필 이미지는 별도로 multipart 업로드합니다.
        /// </summary>
        [HttpPost("artists")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateArtist(
            [FromForm] string name,
            [FromForm] string? bio,
            IFormFile? profileImage)
        {
            if (string.IsNullOrWhiteSpace(name))
                return BadRequest(new { Message = "아티스트 이름은 필수입니다." });

            string? imagePath = null;
            if (profileImage != null)
            {
                var (success, path, error) = await SaveImageFile(profileImage);
                if (!success) return BadRequest(new { Message = error });
                imagePath = path;
            }

            var artist = new Artist
            {
                Name = name.Trim(),
                Bio = bio?.Trim(),
                ProfileImageUrl = imagePath
            };

            _context.Artists.Add(artist);
            await _context.SaveChangesAsync();

            _logger.LogInformation("[보안 로그] 아티스트 등록 완료: {ArtistName} (ID: {ArtistId})", artist.Name, artist.Id);

            return CreatedAtAction(nameof(GetArtist), new { id = artist.Id }, new
            {
                artist.Id,
                artist.Name,
                artist.Bio,
                artist.ProfileImageUrl
            });
        }

        /// <summary>아티스트 목록 조회</summary>
        [HttpGet("artists")]
        public async Task<IActionResult> GetArtists()
        {
            var artists = await _context.Artists
                .Include(a => a.Albums)
                .Select(a => new
                {
                    a.Id,
                    a.Name,
                    a.Bio,
                    a.ProfileImageUrl,
                    AlbumCount = a.Albums.Count
                })
                .ToListAsync();

            return Ok(artists);
        }

        /// <summary>아티스트 상세 조회 (앨범 + 트랙 포함)</summary>
        [HttpGet("artists/{id}")]
        public async Task<IActionResult> GetArtist(int id)
        {
            var artist = await _context.Artists
                .Include(a => a.Albums)
                    .ThenInclude(al => al.Tracks)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (artist == null) return NotFound(new { Message = "아티스트를 찾을 수 없습니다." });

            return Ok(new
            {
                artist.Id,
                artist.Name,
                artist.Bio,
                artist.ProfileImageUrl,
                Albums = artist.Albums.Select(al => new
                {
                    al.Id,
                    al.Title,
                    al.CoverImageUrl,
                    al.ReleaseDate,
                    Tracks = al.Tracks.Select(t => new
                    {
                        t.Id,
                        t.Title,
                        t.Duration,
                        t.TrackNumber
                    })
                })
            });
        }

        // ═══════════════════════════════════════════════════════
        // [2] 앨범 관리 API
        // ═══════════════════════════════════════════════════════

        /// <summary>앨범 생성 (Admin 전용). 커버 이미지 포함 가능.</summary>
        [HttpPost("albums")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateAlbum(
            [FromForm] int artistId,
            [FromForm] string title,
            [FromForm] DateTime? releaseDate,
            IFormFile? coverImage)
        {
            var artist = await _context.Artists.FindAsync(artistId);
            if (artist == null) return NotFound(new { Message = "아티스트를 찾을 수 없습니다." });

            if (string.IsNullOrWhiteSpace(title))
                return BadRequest(new { Message = "앨범 제목은 필수입니다." });

            string? coverPath = null;
            if (coverImage != null)
            {
                var (success, path, error) = await SaveImageFile(coverImage);
                if (!success) return BadRequest(new { Message = error });
                coverPath = path;
            }

            var album = new Album
            {
                ArtistId = artistId,
                Title = title.Trim(),
                CoverImageUrl = coverPath,
                ReleaseDate = releaseDate ?? DateTime.UtcNow
            };

            _context.Albums.Add(album);
            await _context.SaveChangesAsync();

            _logger.LogInformation("[보안 로그] 앨범 생성 완료: {AlbumTitle} (Artist: {ArtistName})", album.Title, artist.Name);

            return CreatedAtAction(nameof(GetAlbum), new { id = album.Id }, new
            {
                album.Id,
                album.ArtistId,
                album.Title,
                album.CoverImageUrl,
                album.ReleaseDate
            });
        }

        /// <summary>앨범 상세 조회</summary>
        [HttpGet("albums/{id}")]
        public async Task<IActionResult> GetAlbum(int id)
        {
            var album = await _context.Albums
                .Include(a => a.Artist)
                .Include(a => a.Tracks)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (album == null) return NotFound(new { Message = "앨범을 찾을 수 없습니다." });

            return Ok(new
            {
                album.Id,
                album.Title,
                album.CoverImageUrl,
                album.ReleaseDate,
                Artist = new { album.Artist.Id, album.Artist.Name },
                Tracks = album.Tracks.OrderBy(t => t.TrackNumber).Select(t => new
                {
                    t.Id,
                    t.Title,
                    t.Duration,
                    t.TrackNumber
                })
            });
        }

        // ═══════════════════════════════════════════════════════
        // [3] 음원 업로드 API (핵심 보안)
        // ═══════════════════════════════════════════════════════

        /// <summary>
        /// 음원 파일 업로드 (Admin 전용).
        /// - MIME 타입 + 매직 바이트 이중 검증
        /// - 파일명 UUID 난수화 (Path Traversal 방지)
        /// - wwwroot 외부 'protected_media/music/' 에 저장
        /// </summary>
        [HttpPost("upload")]
        [Authorize(Roles = "Admin")]
        [RequestSizeLimit(MaxAudioSize + MaxImageSize + 1024)] // 요청 크기 제한
        public async Task<IActionResult> UploadTrack(
            [FromForm] int albumId,
            [FromForm] string title,
            [FromForm] int? trackNumber,
            IFormFile audioFile)
        {
            // ── 유효성 검사 ──
            if (audioFile == null || audioFile.Length == 0)
                return BadRequest(new { Message = "오디오 파일이 필요합니다." });

            if (string.IsNullOrWhiteSpace(title))
                return BadRequest(new { Message = "트랙 제목은 필수입니다." });

            var album = await _context.Albums.Include(a => a.Artist).FirstOrDefaultAsync(a => a.Id == albumId);
            if (album == null) return NotFound(new { Message = "앨범을 찾을 수 없습니다." });

            // ── [보안] 파일 크기 검사 ──
            if (audioFile.Length > MaxAudioSize)
                return BadRequest(new { Message = $"오디오 파일은 {MaxAudioSize / 1024 / 1024}MB를 초과할 수 없습니다." });

            // ── [보안] MIME 타입 검사 ──
            var contentType = audioFile.ContentType.ToLowerInvariant();
            if (!AllowedAudioTypes.ContainsKey(contentType))
            {
                _logger.LogWarning("[보안 경고] 허용되지 않은 MIME 타입 업로드 시도: {ContentType}", contentType);
                return BadRequest(new { Message = "허용되지 않은 파일 형식입니다. (.mp3, .flac만 지원)" });
            }

            // ── [보안] 매직 바이트(파일 시그니처) 검증 ──
            if (!await ValidateAudioMagicBytes(audioFile, contentType))
            {
                _logger.LogWarning("[보안 경고] 매직 바이트 불일치 - MIME 위조 공격 의심: {ContentType}", contentType);
                return BadRequest(new { Message = "파일 내용이 확장자와 일치하지 않습니다." });
            }

            // ── [보안] 파일명 UUID 난수화 + wwwroot 외부 저장 ──
            var fileExtension = contentType == "audio/flac" ? ".flac" : ".mp3";
            var safeFileName = $"{Guid.NewGuid()}{fileExtension}";
            var mediaDir = Path.Combine(Directory.GetCurrentDirectory(), "protected_media", "music");

            if (!Directory.Exists(mediaDir)) Directory.CreateDirectory(mediaDir);

            var absolutePath = Path.Combine(mediaDir, safeFileName);

            // ── 파일 저장 ──
            await using (var stream = new FileStream(absolutePath, FileMode.Create))
            {
                await audioFile.CopyToAsync(stream);
            }

            // ── DB 저장 ──
            var track = new Track
            {
                AlbumId = albumId,
                Title = title.Trim(),
                AudioFilePath = absolutePath,
                Duration = 0, // 실제로는 ffprobe 등으로 측정 가능
                TrackNumber = trackNumber ?? (album.Tracks?.Count ?? 0) + 1
            };

            _context.Tracks.Add(track);
            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "[보안 로그] 음원 업로드 완료: {TrackTitle} → {SafeFileName} (Album: {AlbumTitle}, Artist: {ArtistName})",
                track.Title, safeFileName, album.Title, album.Artist.Name);

            return Ok(new
            {
                Message = "음원 업로드 성공",
                Track = new
                {
                    track.Id,
                    track.Title,
                    track.AlbumId,
                    track.TrackNumber,
                    StreamUrl = $"/api/music/stream/{track.Id}"
                }
            });
        }

        // ═══════════════════════════════════════════════════════
        // [4] 음악 스트리밍 API (HTTP 206 Range Request)
        // ═══════════════════════════════════════════════════════

        /// <summary>
        /// 음악 스트리밍 (인증 필수).
        /// HTTP Range Request를 지원하여 미디어 탐색(건너뛰기)이 가능합니다.
        /// JWT는 HttpOnly 쿠키에서 자동으로 읽힙니다.
        /// </summary>
        [HttpGet("stream/{trackId}")]
        [AllowAnonymous]
        public async Task<IActionResult> StreamMusic(int trackId)
        {
            var track = await _context.Tracks
                .Include(t => t.Album)
                .FirstOrDefaultAsync(t => t.Id == trackId);

            if (track == null)
                return NotFound(new { Message = "트랙을 찾을 수 없습니다." });

            // ── [A10 SSRF 방어] 외부 URL 프록시: 도메인 화이트리스트 검증 ──
            if (track.AudioFilePath.StartsWith("http"))
            {
                // [보안] 허용된 외부 도메인만 프록시 (SSRF 방어)
                var allowedHosts = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                {
                    "audio-ssl.itunes.apple.com",
                    "is1-ssl.mzstatic.com",
                    "is2-ssl.mzstatic.com",
                    "is3-ssl.mzstatic.com",
                    "is4-ssl.mzstatic.com",
                    "is5-ssl.mzstatic.com"
                };

                if (!Uri.TryCreate(track.AudioFilePath, UriKind.Absolute, out var externalUri)
                    || !allowedHosts.Contains(externalUri.Host))
                {
                    _logger.LogWarning("[보안 경고] SSRF 차단: 허용되지 않은 외부 URL 접근 시도 — {Url}", track.AudioFilePath);
                    return BadRequest(new { Message = "허용되지 않은 외부 음원 주소입니다." });
                }

                _logger.LogInformation("[스트리밍] 외부 URL 프록시 스트리밍: {Url}", track.AudioFilePath);
                try {
                    var client = _httpClientFactory.CreateClient();
                    var response = await client.GetAsync(track.AudioFilePath, System.Net.Http.HttpCompletionOption.ResponseHeadersRead);
                    if (!response.IsSuccessStatusCode) return NotFound(new { Message = "외부 음원을 가져올 수 없습니다." });
                    
                    var stream = await response.Content.ReadAsStreamAsync();
                    var contentType = response.Content.Headers.ContentType?.ToString() ?? "audio/mpeg";
                    
                    return File(stream, contentType);
                } catch (Exception ex) {
                    _logger.LogError(ex, "[스트리밍] 프록시 스트리밍 중 오류 발생");
                    return StatusCode(502, new { Message = "외부 음원 서버와의 통신 중 오류가 발생했습니다." });
                }
            }

            // 로컬 파일 스트리밍은 인증 필요
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr))
                return Unauthorized(new { Message = "인증이 필요합니다." });

            // ── [보안] 경로 검증: Directory Traversal 방지 ──
            var mediaBaseDir = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "protected_media"));
            var resolvedPath = Path.GetFullPath(track.AudioFilePath);

            if (!resolvedPath.StartsWith(mediaBaseDir))
            {
                _logger.LogWarning("[보안 경고] 디렉토리 트래버설 공격 탐지: {Path}", track.AudioFilePath);
                return BadRequest(new { Message = "잘못된 파일 경로입니다." });
            }

            if (!System.IO.File.Exists(resolvedPath))
            {
                _logger.LogWarning("[보안 로그] 스트리밍 파일 미발견: TrackId={TrackId}, Path={Path}", trackId, resolvedPath);
                return NotFound(new { Message = "오디오 파일을 찾을 수 없습니다." });
            }

            // MIME 타입 결정
            var mimeType = resolvedPath.EndsWith(".flac", StringComparison.OrdinalIgnoreCase)
                ? "audio/flac"
                : "audio/mpeg";

            _logger.LogInformation("[스트리밍] TrackId={TrackId}, Title={Title}", trackId, track.Title);

            // ── enableRangeProcessing: true → HTTP 206 Partial Content 지원 ──
            // 클라이언트가 Range 헤더를 보내면 자동으로 206 응답을 반환합니다.
            return PhysicalFile(resolvedPath, mimeType, enableRangeProcessing: true);
        }

        // ═══════════════════════════════════════════════════════
        // [5] 트랙 목록 조회 (공개)
        // ═══════════════════════════════════════════════════════

        /// <summary>전체 트랙 목록 (페이지네이션)</summary>
        [HttpGet("tracks")]
        public async Task<IActionResult> GetTracks([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            pageSize = Math.Clamp(pageSize, 1, 100);
            page = Math.Max(1, page);

            var totalCount = await _context.Tracks.CountAsync();
            var tracks = await _context.Tracks
                .Include(t => t.Album)
                    .ThenInclude(a => a.Artist)
                .OrderByDescending(t => t.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(t => new
                {
                    t.Id,
                    t.Title,
                    t.Duration,
                    t.TrackNumber,
                    Album = new { t.Album.Id, t.Album.Title, t.Album.CoverImageUrl },
                    Artist = new { t.Album.Artist.Id, t.Album.Artist.Name }
                })
                .ToListAsync();

            return Ok(new { TotalCount = totalCount, Page = page, PageSize = pageSize, Tracks = tracks });
        }

        // ═══════════════════════════════════════════════════════
        // [6] 이미지 제공 API (앨범 아트, 아티스트 프로필)
        // ═══════════════════════════════════════════════════════

        /// <summary>protected_media/images/ 내 이미지 파일 제공</summary>
        [HttpGet("image/{fileName}")]
        public IActionResult GetImage(string fileName)
        {
            // 보안: 파일명에 경로 구분자가 포함되면 차단
            if (fileName.Contains("..") || fileName.Contains('/') || fileName.Contains('\\'))
            {
                _logger.LogWarning("[보안 경고] 이미지 경로 조작 시도: {FileName}", fileName);
                return BadRequest(new { Message = "잘못된 파일명입니다." });
            }

            var imageDir = Path.Combine(Directory.GetCurrentDirectory(), "protected_media", "images");
            var filePath = Path.GetFullPath(Path.Combine(imageDir, fileName));

            // 보안: 디렉토리 트래버설 방지
            if (!filePath.StartsWith(Path.GetFullPath(imageDir)))
                return BadRequest(new { Message = "잘못된 파일 경로입니다." });

            if (!System.IO.File.Exists(filePath))
                return NotFound();

            var ext = Path.GetExtension(filePath).ToLowerInvariant();
            var mime = ext switch
            {
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".webp" => "image/webp",
                _ => "application/octet-stream"
            };

            return PhysicalFile(filePath, mime);
        }

        // ═══════════════════════════════════════════════════════
        // [7] 검색 및 탐색 API (동적 데이터 지원)
        // ═══════════════════════════════════════════════════════

        /// <summary>통합 검색 (트랙, 아티스트, 앨범)</summary>
        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] string q)
        {
            if (string.IsNullOrWhiteSpace(q)) return BadRequest(new { Message = "검색어를 입력하세요." });

            var query = q.Trim().ToLower();

            var tracks = await _context.Tracks
                .Include(t => t.Album)
                    .ThenInclude(a => a.Artist)
                .Where(t => t.Title.ToLower().Contains(query))
                .Take(10)
                .Select(t => new { t.Id, t.Title, t.Duration, t.Genre, Artist = t.Album.Artist.Name, ArtistId = t.Album.Artist.Id, AlbumCover = t.Album.CoverImageUrl })
                .ToListAsync();

            var artists = await _context.Artists
                .Where(a => a.Name.ToLower().Contains(query))
                .Take(10)
                .Select(a => new { a.Id, a.Name, a.ProfileImageUrl })
                .ToListAsync();

            var albums = await _context.Albums
                .Include(a => a.Artist)
                .Where(a => a.Title.ToLower().Contains(query))
                .Take(10)
                .Select(a => new { a.Id, a.Title, Artist = a.Artist.Name, ArtistId = a.Artist.Id, a.CoverImageUrl })
                .ToListAsync();

            return Ok(new { Tracks = tracks, Artists = artists, Albums = albums });
        }

        /// <summary>최신 릴리스 (둘러보기용)</summary>
        [HttpGet("new-releases")]
        public async Task<IActionResult> GetNewReleases()
        {
            var albums = await _context.Albums
                .Include(a => a.Artist)
                .OrderByDescending(a => a.ReleaseDate)
                .Take(10)
                .Select(a => new
                {
                    a.Id,
                    a.Title,
                    ArtistName = a.Artist.Name,
                    ArtistId = a.Artist.Id,
                    a.CoverImageUrl,
                    a.ReleaseDate
                })
                .ToListAsync();
            return Ok(albums);
        }

        /// <summary>인기 곡 (홈/둘러보기용)</summary>
        [HttpGet("trending")]
        public async Task<IActionResult> GetTrendingTracks()
        {
            // 실제로는 조회수 컬럼이 필요하지만, 현재는 최신 등록 순으로 대체
            var tracks = await _context.Tracks
                .Include(t => t.Album)
                    .ThenInclude(a => a.Artist)
                .OrderByDescending(t => t.Id)
                .Take(15)
                .Select(t => new
                {
                    t.Id,
                    t.Title,
                    t.Genre,
                    ArtistName = t.Album.Artist.Name,
                    ArtistId = t.Album.Artist.Id,
                    AlbumCover = t.Album.CoverImageUrl,
                    t.Duration
                })
                .ToListAsync();
            return Ok(tracks);
        }

        /// <summary>장르별 곡 조회</summary>
        [HttpGet("by-genre")]
        public async Task<IActionResult> GetTracksByGenre([FromQuery] string genre)
        {
            if (string.IsNullOrWhiteSpace(genre)) return BadRequest(new { Message = "장르를 지정하세요." });

            var tracks = await _context.Tracks
                .Include(t => t.Album)
                    .ThenInclude(a => a.Artist)
                .Where(t => t.Genre != null && t.Genre.ToLower() == genre.ToLower())
                .OrderByDescending(t => t.Id)
                .Take(10)
                .Select(t => new
                {
                    t.Id,
                    t.Title,
                    t.Genre,
                    ArtistName = t.Album.Artist.Name,
                    ArtistId = t.Album.Artist.Id,
                    AlbumCover = t.Album.CoverImageUrl,
                    t.Duration
                })
                .ToListAsync();
            return Ok(tracks);
        }

        // ═══════════════════════════════════════════════════════
        // Private Helper Methods
        // ═══════════════════════════════════════════════════════

        /// <summary>
        /// 오디오 파일의 매직 바이트(파일 시그니처)를 검증합니다.
        /// Content-Type 헤더만 변경하는 MIME 위조 공격을 방어합니다.
        /// </summary>
        private async Task<bool> ValidateAudioMagicBytes(IFormFile file, string contentType)
        {
            var expectedMagic = AllowedAudioTypes[contentType];
            var headerBuffer = new byte[Math.Max(expectedMagic.Length, Id3v2Magic.Length)];

            using var stream = file.OpenReadStream();
            var bytesRead = await stream.ReadAsync(headerBuffer, 0, headerBuffer.Length);

            if (bytesRead < expectedMagic.Length) return false;

            // MP3: ID3v2 태그 또는 MPEG 프레임 싱크 바이트 중 하나와 일치하면 통과
            if (contentType == "audio/mpeg")
            {
                bool isId3 = headerBuffer.Take(Id3v2Magic.Length).SequenceEqual(Id3v2Magic);
                bool isMpegSync = headerBuffer[0] == 0xFF && (headerBuffer[1] & 0xE0) == 0xE0;
                return isId3 || isMpegSync;
            }

            // FLAC: fLaC 매직 바이트
            return headerBuffer.Take(expectedMagic.Length).SequenceEqual(expectedMagic);
        }

        /// <summary>
        /// 이미지 파일을 보안 검증 후 protected_media/images/에 UUID 이름으로 저장합니다.
        /// </summary>
        private async Task<(bool Success, string? Path, string? Error)> SaveImageFile(IFormFile imageFile)
        {
            if (imageFile.Length > MaxImageSize)
                return (false, null, $"이미지 파일은 {MaxImageSize / 1024 / 1024}MB를 초과할 수 없습니다.");

            var imageContentType = imageFile.ContentType.ToLowerInvariant();
            if (!AllowedImageTypes.Contains(imageContentType))
                return (false, null, "허용되지 않은 이미지 형식입니다. (jpg, png, webp만 지원)");

            // 매직 바이트 검증
            if (ImageMagicBytes.TryGetValue(imageContentType, out var magic))
            {
                var buffer = new byte[magic.Length];
                using var readStream = imageFile.OpenReadStream();
                var read = await readStream.ReadAsync(buffer, 0, buffer.Length);
                if (read < magic.Length || !buffer.Take(magic.Length).SequenceEqual(magic))
                {
                    _logger.LogWarning("[보안 경고] 이미지 매직 바이트 불일치: {ContentType}", imageContentType);
                    return (false, null, "이미지 파일 내용이 확장자와 일치하지 않습니다.");
                }
            }

            var ext = imageContentType switch
            {
                "image/jpeg" => ".jpg",
                "image/png" => ".png",
                "image/webp" => ".webp",
                _ => ".bin"
            };

            var safeFileName = $"{Guid.NewGuid()}{ext}";
            var imageDir = Path.Combine(Directory.GetCurrentDirectory(), "protected_media", "images");
            if (!Directory.Exists(imageDir)) Directory.CreateDirectory(imageDir);

            var absolutePath = Path.Combine(imageDir, safeFileName);
            await using (var stream = new FileStream(absolutePath, FileMode.Create))
            {
                await imageFile.CopyToAsync(stream);
            }

            // 반환 경로: API를 통해 접근 가능한 상대 경로
            return (true, $"/api/music/image/{safeFileName}", null);
        }
    }
}
