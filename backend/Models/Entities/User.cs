using System;
using System.Collections.Generic;

namespace Project.Models.Entities
{
    public class User
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Nickname { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty; // BCrypt Hash
        public string Role { get; set; } = "User"; // A01: 접근 제어 용 Role
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // 비밀번호 재설정용 토큰 및 만료 시각
        public string? PasswordResetToken { get; set; }
        public DateTime? ResetTokenExpiry { get; set; }
        
        public List<RefreshToken> RefreshTokens { get; set; } = new();
    }
}
