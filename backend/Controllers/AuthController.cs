using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.RateLimiting;
using Project.Data;
using Project.Models.Entities;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using System;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;

namespace Project.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IConfiguration _config;
        private readonly AppDbContext _context;
        private readonly Project.Services.IEmailSender _emailSender;
        private readonly ILogger<AuthController> _logger;

        public AuthController(IConfiguration config, AppDbContext context, Project.Services.IEmailSender emailSender, ILogger<AuthController> logger)
        {
            _config = config;
            _context = context;
            _emailSender = emailSender;
            _logger = logger;
        }

        public class LoginDto
        {
            public string Email { get; set; } = string.Empty; // 이메일 또는 아이디
            public string Password { get; set; } = string.Empty;
        }

        public class RegisterDto
        {
            public string Name { get; set; } = string.Empty;
            public string Nickname { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
        }

        public class ForgotPasswordDto
        {
            public string Email { get; set; } = string.Empty;
        }

        public class ResetPasswordDto
        {
            public string Email { get; set; } = string.Empty;
            public string Token { get; set; } = string.Empty;
            public string NewPassword { get; set; } = string.Empty;
        }

        [HttpPost("register")]
        [EnableRateLimiting("LoginPolicy")] // [A07] 회원가입 무차별 요청 방지
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
                return BadRequest(new { Message = "유효하지 않은 입력입니다." });

            // [A04] 입력 길이 제한
            if (dto.Email.Length > 200)
                return BadRequest(new { Message = "이메일은 200자를 초과할 수 없습니다." });
            if (!string.IsNullOrEmpty(dto.Name) && dto.Name.Length > 50)
                return BadRequest(new { Message = "이름은 50자를 초과할 수 없습니다." });
            if (!string.IsNullOrEmpty(dto.Nickname) && dto.Nickname.Length > 50)
                return BadRequest(new { Message = "닉네임은 50자를 초과할 수 없습니다." });

            if (!Regex.IsMatch(dto.Password, @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$"))
                return BadRequest(new { Message = "비밀번호는 영문 대소문자, 숫자, 특수문자를 모두 포함하여 8자 이상이어야 합니다." });

            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (existingUser != null)
                return BadRequest(new { Message = "이미 존재하는 이메일입니다." });

            // BCrypt 단방향 해싱 (강력한 Work Factor 내부 적용됨)
            string hashedPassword = BCrypt.Net.BCrypt.HashPassword(dto.Password);

            var newUser = new User
            {
                Name = dto.Name,
                Nickname = dto.Nickname,
                Email = dto.Email,
                PasswordHash = hashedPassword,
                Role = "User",
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "회원가입이 완료되었습니다." });
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Email))
                return BadRequest(new { Message = "이메일을 입력해주세요." });

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (user == null)
            {
                // 보안을 위해 이메일 존재 여부를 알리지 않음
                return Ok(new { Message = "등록된 이메일로 비밀번호 재설정 링크가 발송되었습니다." });
            }

            // 토큰 생성 로직 (HMAC SHA256 기반)
            string secret = _config["PasswordReset:TokenSecret"] ?? "AuraNocturnePasswordResetSecretKeyMustBe32Bytes!!";
            string rawData = $"{user.Id}-{user.Email}-{DateTime.UtcNow.Ticks}";
            using var hmac = new System.Security.Cryptography.HMACSHA256(Encoding.UTF8.GetBytes(secret));
            byte[] hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(rawData));
            string token = Convert.ToBase64String(hash);

            // DB 저장
            user.PasswordResetToken = token;
            user.ResetTokenExpiry = DateTime.UtcNow.AddMinutes(double.Parse(_config["PasswordReset:TokenExpiryMinutes"] ?? "30"));
            await _context.SaveChangesAsync();

            // 이메일 발송
            string frontendUrl = _config["PasswordReset:FrontendBaseUrl"] ?? "https://localhost:3000";
            string encodedToken = Uri.EscapeDataString(token);
            string encodedEmail = Uri.EscapeDataString(user.Email);
            string resetLink = $"{frontendUrl}/reset-password?email={encodedEmail}&token={encodedToken}";

            string htmlMessage = $@"
                <div style='font-family: sans-serif; padding: 20px; background-color: #121212; color: #ffffff;'>
                    <h2 style='color: #00ffa3;'>AURA NOCTURNE</h2>
                    <p>안녕하세요.</p>
                    <p>비밀번호 재설정을 위한 링크입니다. 아래 버튼을 클릭하여 새 비밀번호를 설정해주세요.</p>
                    <a href='{resetLink}' style='display: inline-block; padding: 10px 20px; margin-top: 10px; background-color: #00ffa3; color: #000000; text-decoration: none; border-radius: 5px; font-weight: bold;'>비밀번호 재설정하기</a>
                    <p style='margin-top: 20px; color: #aaaaaa; font-size: 12px;'>이 링크는 30분 동안 유효합니다. 본인이 요청하지 않은 경우 이 이메일을 무시하셔도 됩니다.</p>
                </div>";

            await _emailSender.SendEmailAsync(user.Email, "Aura Nocturne: 비밀번호 재설정", htmlMessage);

            return Ok(new { Message = "등록된 이메일로 비밀번호 재설정 링크가 발송되었습니다." });
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Token) || string.IsNullOrWhiteSpace(dto.NewPassword))
                return BadRequest(new { Message = "유효하지 않은 요청입니다." });

            if (!Regex.IsMatch(dto.NewPassword, @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$"))
                return BadRequest(new { Message = "비밀번호는 영문 대소문자, 숫자, 특수문자를 모두 포함하여 8자 이상이어야 합니다." });


            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            // URL 인코딩 등에서 +-가 공백으로 변환될 수 있으므로 Replace 고려
            if (user == null || (user.PasswordResetToken != dto.Token && user.PasswordResetToken != dto.Token.Replace(" ", "+")))
                return BadRequest(new { Message = "유효하지 않거나 만료된 토큰입니다." });

            if (user.ResetTokenExpiry == null || user.ResetTokenExpiry < DateTime.UtcNow)
                return BadRequest(new { Message = "토큰이 만료되었습니다. 다시 시도해주세요." });

            // 비밀번호 변경
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            // 토큰 초기화 (일회용)
            user.PasswordResetToken = null;
            user.ResetTokenExpiry = null;

            await _context.SaveChangesAsync();
            return Ok(new { Message = "비밀번호가 성공적으로 변경되었습니다." });
        }

        [HttpPost("login")]
        [EnableRateLimiting("LoginPolicy")] 
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            // 이메일 또는 아이디(Email 필드) 양츠로 조회
            var input = dto.Email.Trim();
            var user = await _context.Users.FirstOrDefaultAsync(
                u => u.Email == input || u.Name == input);
            
            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            {
                // [A09] 로그인 실패 보안 로깅 (Brute-force 탐지용)
                _logger.LogWarning(
                    "[보안 경고] 로그인 실패 — 입력: {Input}, IP: {IP}, 시간: {Time}",
                    dto.Email, HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown", DateTime.UtcNow);
                return Unauthorized(new { Message = "이메일 또는 비밀번호가 다릅니다." });
            }

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim("nickname", user.Nickname)
            };

            // [보안 강화] JWT 비밀 키는 반드시 설정에서 로드 (폴백 키 사용 금지)
            var secretKey = _config["Jwt:Key"] 
                ?? throw new InvalidOperationException("JWT Key가 appsettings.json에 설정되지 않았습니다.");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"] ?? "MusicAppIssuer",
                audience: _config["Jwt:Audience"] ?? "MusicAppAudience",
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(15), 
                signingCredentials: creds
            );

            var accessToken = new JwtSecurityTokenHandler().WriteToken(token);

            // HttpOnly Cookie에 Refresh Token 굽는 로직 등은 기존 아키텍처 생략
            Response.Cookies.Append("accessToken", accessToken, new Microsoft.AspNetCore.Http.CookieOptions
            {
                HttpOnly = true,
                Secure = true,   // [HTTPS] HTTPS 전용 쿠키
                SameSite = Microsoft.AspNetCore.Http.SameSiteMode.Lax,
                Path = "/",
                IsEssential = true
                // Expires를 설정하지 않으면 세션 쿠키가 되어 브라우저 종료 시 자동 삭제됩니다.
            });

            return Ok(new { Message = "로그인 성공", Nickname = user.Nickname, Role = user.Role });
        }

        [HttpPost("refresh")]
        public IActionResult Refresh()
        {
            // [보안 경고] Refresh Token 검증 로직이 미구현 상태입니다.
            // 프로덕션에서는 DB에 저장된 Refresh Token과 대조 후 새로운 Access Token을 발급해야 합니다.
            _logger.LogWarning("[보안] Refresh Token 요청 수신 — 현재 placeholder 상태");
            return Ok(new { Message = "Token refreshed (placeholder)" });
        }

        /// <summary>
        /// [A07] 서버측 로그아웃 — HttpOnly 쿠키를 서버에서 명시적으로 삭제합니다.
        /// 클라이언트에서 JS로 HttpOnly 쿠키를 완전히 삭제할 수 없으므로
        /// 반드시 서버측에서 쿠키를 만료시켜야 합니다.
        /// </summary>
        [HttpPost("logout")]
        public IActionResult Logout()
        {
            Response.Cookies.Delete("accessToken", new Microsoft.AspNetCore.Http.CookieOptions
            {
                Path = "/",
                Secure = true,    // [보안 수정] Login과 동일하게 Secure 플래그 통일
                SameSite = Microsoft.AspNetCore.Http.SameSiteMode.Lax
            });
            return Ok(new { Message = "로그아웃 되었습니다." });
        }
    }
}


