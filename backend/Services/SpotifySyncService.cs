using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Project.Data;
using Project.Models.Entities;

namespace Project.Services
{
    public interface ISpotifySyncService
    {
        Task<int> SyncSpotifyDataAsync(string query = "K-Pop", int limit = 50);
    }

    // Spotify API 권한 문제(Premium 구독 필요)를 우회하기 위해,
    // 로그인 없이 30초 음원을 무료로 제공하는 iTunes Search API로 내부 로직을 대체합니다.
    public class SpotifySyncService : ISpotifySyncService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly AppDbContext _context;
        private readonly ILogger<SpotifySyncService> _logger;

        public SpotifySyncService(
            IHttpClientFactory httpClientFactory,
            IConfiguration config,
            AppDbContext context,
            ILogger<SpotifySyncService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _context = context;
            _logger = logger;
        }

        public async Task<int> SyncSpotifyDataAsync(string query = "K-Pop", int limit = 50)
        {
            _logger.LogInformation("음원 데이터 동기화 시작 (iTunes API 사용): Query='{query}', Limit={limit}", query, limit);
            
            var client = _httpClientFactory.CreateClient("MusicApi");
            // iTunes API 호출
            var searchUrl = $"https://itunes.apple.com/search?term={Uri.EscapeDataString(query)}&entity=song&limit={limit}";
            
            var response = await client.GetAsync(searchUrl);
            response.EnsureSuccessStatusCode();

            var responseStream = await response.Content.ReadAsStreamAsync();
            using var jsonDocument = await JsonDocument.ParseAsync(responseStream);

            var tracksElement = jsonDocument.RootElement.GetProperty("results");

            int importedCount = 0;

            foreach (var trackObj in tracksElement.EnumerateArray())
            {
                // previewUrl이 없는 곡 스킵
                if (!trackObj.TryGetProperty("previewUrl", out var previewUrlProp) || string.IsNullOrEmpty(previewUrlProp.GetString()))
                {
                    continue;
                }
                var previewUrl = previewUrlProp.GetString();

                var title = trackObj.TryGetProperty("trackName", out var trackNameProp) ? trackNameProp.GetString() ?? "Unknown Title" : "Unknown Title";
                var durationMs = trackObj.TryGetProperty("trackTimeMillis", out var durationProp) ? durationProp.GetInt32() : 30000;
                var durationSec = durationMs / 1000;
                var trackNumber = trackObj.TryGetProperty("trackNumber", out var trackNumProp) ? trackNumProp.GetInt32() : 1;

                var albumTitle = trackObj.TryGetProperty("collectionName", out var collNameProp) ? collNameProp.GetString() ?? "Unknown Album" : "Unknown Album";
                var releaseDateStr = trackObj.TryGetProperty("releaseDate", out var relDateProp) ? relDateProp.GetString() ?? "2000-01-01" : "2000-01-01";
                
                // 앨범 아트 고해상도로 변환
                string? coverImageUrl = null;
                if (trackObj.TryGetProperty("artworkUrl100", out var artProp))
                {
                    coverImageUrl = artProp.GetString()?.Replace("100x100bb", "600x600bb");
                }

                var artistName = trackObj.TryGetProperty("artistName", out var artistProp) ? artistProp.GetString() ?? "Unknown Artist" : "Unknown Artist";
                var genreName = trackObj.TryGetProperty("primaryGenreName", out var genreProp) ? genreProp.GetString() : null;

                // 날짜 파싱
                DateTime parsedReleaseDate = DateTime.UtcNow;
                if (DateTime.TryParse(releaseDateStr, out var tempDate))
                {
                    parsedReleaseDate = tempDate.ToUniversalTime();
                }

                // ── DB 저장 로직 (중복 방지) ──
                
                // 1. Artist
                var artist = await _context.Artists.FirstOrDefaultAsync(a => a.Name == artistName);
                if (artist == null)
                {
                    artist = new Artist { Name = artistName, Bio = "자동 동기화된 아티스트입니다." };
                    _context.Artists.Add(artist);
                    await _context.SaveChangesAsync();
                }

                // 2. Album
                var album = await _context.Albums.FirstOrDefaultAsync(a => a.Title == albumTitle && a.ArtistId == artist.Id);
                if (album == null)
                {
                    album = new Album 
                    { 
                        Title = albumTitle, 
                        ArtistId = artist.Id, 
                        CoverImageUrl = coverImageUrl,
                        ReleaseDate = parsedReleaseDate
                    };
                    _context.Albums.Add(album);
                    await _context.SaveChangesAsync();
                }

                // 3. Track
                var track = await _context.Tracks.FirstOrDefaultAsync(t => t.Title == title && t.AlbumId == album.Id);
                if (track == null)
                {
                    track = new Track
                    {
                        Title = title,
                        AlbumId = album.Id,
                        Duration = durationSec,
                        TrackNumber = trackNumber,
                        AudioFilePath = previewUrl, // 미리듣기 URL 저장
                        Genre = genreName
                    };
                    _context.Tracks.Add(track);
                    importedCount++;
                }
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("음원 데이터 동기화 완료: 총 {count}개의 곡이 저장되었습니다.", importedCount);

            return importedCount;
        }
    }
}
