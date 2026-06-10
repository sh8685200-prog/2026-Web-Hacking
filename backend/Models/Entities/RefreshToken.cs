using System;

namespace Project.Models.Entities
{
    public class RefreshToken
    {
        public int Id { get; set; }
        public string Token { get; set; } = string.Empty; // Random token string
        public DateTime ExpiryDate { get; set; }
        public bool IsRevoked { get; set; }
        
        // Navigation properties
        public int UserId { get; set; }
        public User User { get; set; } = null!;
    }
}
