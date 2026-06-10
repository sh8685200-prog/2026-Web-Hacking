using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace Project.Models.Entities
{
    /// <summary>
    /// 음원 좋아요(보관함) 연결 테이블.
    /// User ↔ Track 다대다(N:M) 관계를 위한 명시적 조인 엔티티.
    /// 복합 키: (UserId, TrackId)
    /// </summary>
    public class UserLikedTrack
    {
        public int UserId { get; set; }

        [ForeignKey("UserId")]
        public User User { get; set; } = null!;

        public int TrackId { get; set; }

        [ForeignKey("TrackId")]
        public Track Track { get; set; } = null!;

        public DateTime LikedAt { get; set; } = DateTime.UtcNow;
    }
}
