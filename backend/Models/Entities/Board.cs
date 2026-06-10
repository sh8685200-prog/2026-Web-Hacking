using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Project.Models.Entities
{
    /// <summary>
    /// 팬톡 게시판 엔티티.
    /// ArtistId를 통해 특정 아티스트 팬톡에 종속됩니다.
    /// [보안] Content는 서버에서 HTML 인코딩 처리 후 저장됩니다.
    /// </summary>
    public class Board
    {
        public int Id { get; set; }

        // FK → Artist (어느 아티스트 팬톡인지)
        public int ArtistId { get; set; }

        [ForeignKey("ArtistId")]
        public Artist Artist { get; set; } = null!;

        // FK → User (작성자)
        public int UserId { get; set; }

        [ForeignKey("UserId")]
        public User User { get; set; } = null!;

        [Required, MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// 게시글 본문. 서버에서 System.Net.WebUtility.HtmlEncode로 인코딩 후 저장됩니다.
        /// </summary>
        [Required, MaxLength(5000)]
        public string Content { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Navigation
        public List<Comment> Comments { get; set; } = new();
    }
}
