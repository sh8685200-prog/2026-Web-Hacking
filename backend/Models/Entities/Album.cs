using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Project.Models.Entities
{
    /// <summary>
    /// 앨범 엔티티.
    /// Artist에 종속되며, Track과 1:N 관계를 가집니다.
    /// </summary>
    public class Album
    {
        public int Id { get; set; }

        // FK → Artist
        public int ArtistId { get; set; }

        [ForeignKey("ArtistId")]
        public Artist Artist { get; set; } = null!;

        [Required, MaxLength(300)]
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// 앨범 커버 이미지 파일의 서버 내 상대 경로.
        /// wwwroot 외부(protected_media/images/)에 UUID로 저장됩니다.
        /// </summary>
        [MaxLength(500)]
        public string? CoverImageUrl { get; set; }

        public DateTime ReleaseDate { get; set; } = DateTime.UtcNow;

        // Navigation: 1 Album → N Tracks
        public List<Track> Tracks { get; set; } = new();
    }
}
