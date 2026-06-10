using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Project.Models.Entities
{
    /// <summary>
    /// 댓글 엔티티.
    /// Board에 종속되며, UserId로 작성자를 추적합니다.
    /// </summary>
    public class Comment
    {
        public int Id { get; set; }

        // FK → Board
        public int BoardId { get; set; }

        [ForeignKey("BoardId")]
        public Board Board { get; set; } = null!;

        // FK → User (작성자)
        public int UserId { get; set; }

        [ForeignKey("UserId")]
        public User User { get; set; } = null!;

        /// <summary>
        /// 댓글 내용. 서버에서 HTML 인코딩 처리 후 저장됩니다.
        /// </summary>
        [Required, MaxLength(2000)]
        public string Content { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
