using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Project.Models.Entities
{
    /// <summary>
    /// 트랙(곡) 엔티티.
    /// Album에 종속됩니다. 오디오 파일은 wwwroot 외부에 UUID 이름으로 저장됩니다.
    /// </summary>
    public class Track
    {
        public int Id { get; set; }

        // FK → Album
        public int AlbumId { get; set; }

        [ForeignKey("AlbumId")]
        public Album Album { get; set; } = null!;

        [Required, MaxLength(300)]
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// 오디오 파일의 서버 내 절대 경로.
        /// 예: protected_media/music/550e8400-e29b-41d4-a716-446655440000.mp3
        /// </summary>
        [Required, MaxLength(500)]
        public string AudioFilePath { get; set; } = string.Empty;

        /// <summary>
        /// 재생 시간(초 단위). 업로드 시 서버에서 계산됩니다.
        /// </summary>
        public int Duration { get; set; }

        /// <summary>
        /// 트랙 번호 (앨범 내 순서)
        /// </summary>
        public int TrackNumber { get; set; } = 1;
        
        /// <summary>
        /// 장르 (예: Pop, Hip-Hop, Rock)
        /// </summary>
        [MaxLength(100)]
        public string? Genre { get; set; }
    }
}
