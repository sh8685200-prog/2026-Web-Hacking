using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Project.Models.Entities
{
    /// <summary>
    /// 아티스트 엔티티.
    /// Album과 1:N 관계를 가집니다.
    /// </summary>
    public class Artist
    {
        public int Id { get; set; }

        [Required, MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(2000)]
        public string? Bio { get; set; }

        /// <summary>
        /// 프로필 이미지 파일의 서버 내 상대 경로.
        /// wwwroot 외부(protected_media/images/)에 UUID로 저장됩니다.
        /// </summary>
        [MaxLength(500)]
        public string? ProfileImageUrl { get; set; }

        // Navigation: 1 Artist → N Albums
        public List<Album> Albums { get; set; } = new();
    }
}
