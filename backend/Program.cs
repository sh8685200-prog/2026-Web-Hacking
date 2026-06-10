using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.RateLimiting;
using Serilog;
using System.Text;
using System.Threading.RateLimiting;
using Project.Data;
using Project.Middleware;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration; // Added

var builder = WebApplication.CreateBuilder(args);

// [데이터 동기화 명령 처리]
if (args.Length > 0 && args[0] == "sync")
{
    var syncQuery = args.Length > 1 ? args[1] : "K-Pop";
    var syncLimit = args.Length > 2 && int.TryParse(args[2], out var limit) ? limit : 50;

    builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite("Data Source=app.db"));
    builder.Services.AddHttpClient();
    builder.Services.AddScoped<Project.Services.ISpotifySyncService, Project.Services.SpotifySyncService>();
    builder.Services.AddLogging(l => l.AddConsole());

    var syncApp = builder.Build();
    using var scope = syncApp.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.EnsureCreated();
    
    var syncService = scope.ServiceProvider.GetRequiredService<Project.Services.ISpotifySyncService>();
    
    Console.WriteLine($"Starting sync for: {syncQuery} (Limit: {syncLimit})");
    await syncService.SyncSpotifyDataAsync(syncQuery, syncLimit);
    Console.WriteLine("Sync completed.");
    return;
}

// [A09] 구조화된 보안 감사 로그(Serilog) 설정
// 로그 파일은 wwwroot 외부(backend/Logs)에 저장하여 클라이언트 직접 접근을 차단합니다.
var logsPath = Path.Combine(builder.Environment.ContentRootPath, "Logs", "security-log-.txt");
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft", Serilog.Events.LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.AspNetCore", Serilog.Events.LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .WriteTo.Console(
        outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
    .WriteTo.File(
        path: logsPath,
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 90,       // 90일간 로그 보관
        fileSizeLimitBytes: 50_000_000,    // 파일당 최대 50MB
        rollOnFileSizeLimit: true,
        outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz}] [{Level:u3}] {Message:lj}{NewLine}{Exception}",
        shared: true)                      // 다중 프로세스 안전
    .CreateLogger();
builder.Host.UseSerilog();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=app.db"));

builder.Services.AddControllers();

// [비밀번호 찾기] EmailService 의존성 주입
builder.Services.AddScoped<Project.Services.IEmailSender, Project.Services.EmailService>();

// [외부 API 호출 보안] IHttpClientFactory 등록 및 SpotifySyncService 의존성 주입
builder.Services.AddHttpClient();
builder.Services.AddScoped<Project.Services.ISpotifySyncService, Project.Services.SpotifySyncService>();

// ============================================================
// [A07] IP 기반 Rate Limiting 정책 (Brute-force 및 DDoS 방지)
// Fixed Window: 동일 IP에서 1분간 5회 초과 시 429 반환
// ============================================================
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        context.HttpContext.Response.ContentType = "application/json";

        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            context.HttpContext.Response.Headers.Append("Retry-After", ((int)retryAfter.TotalSeconds).ToString());
        }

        // [A09] Rate Limit 초과 보안 로깅
        var remoteIp = context.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var path = context.HttpContext.Request.Path;
        Log.Warning("[보안 경고] Rate Limit 초과 — IP: {IP}, Path: {Path}, Time: {Time}",
            remoteIp, path, DateTime.UtcNow);

        await context.HttpContext.Response.WriteAsync(
            System.Text.Json.JsonSerializer.Serialize(new
            {
                Message = "요청이 너무 많습니다. 1분 후 다시 시도해주세요.",
                RetryAfterSeconds = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var ra)
                    ? (int)ra.TotalSeconds : 60
            }),
            cancellationToken);
    };

    // [A07] 로그인 전용 고정 윈도우 정책 — IP별 파티셔닝
    options.AddPolicy("LoginPolicy", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,                                    // 1분에 최대 5회
                Window = TimeSpan.FromMinutes(1),                   // 고정 윈도우: 1분
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0                                      // 대기열 없이 즉시 거부
            }));

    // [A07] 전역 API 보호 정책 (선택적 — 일반 API 남용 방지)
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 100,                                  // 1분에 최대 100회 (전역)
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));
});

// [심화 방어] Anti-CSRF 토큰 서비스 추가 (SPA 환경 대응)
builder.Services.AddAntiforgery(options => 
{
    options.HeaderName = "X-CSRF-TOKEN";
    // CSRF 토큰 쿠키 SameSite = Lax로 설정 (포트가 다를 때 Strict는 차단될 수 있음)
    options.Cookie.SameSite = SameSiteMode.Lax;
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("StrictCorsPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "https://localhost:3000", "http://localhost:3001", "https://localhost:3001", "http://localhost:3002", "https://localhost:3002", "http://localhost:3003", "https://localhost:3003", "http://localhost:5173", "https://localhost:5173") // 명시적 프론트 주소
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // HttpOnly 및 CSRF 쿠키 허용
    });
});

// [A01] JWT 인증 ( HttpOnly / SameSite 설정 )
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "https://localhost:5001",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "https://localhost:3000",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? "super_secret_key_which_must_be_long_enough"))
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                context.Token = context.Request.Cookies["accessToken"]; // 짧은 수명(ex: 15분) 토큰
                return Task.CompletedTask;
            }
        };
    });

// [배포] Kestrel 서버 헤더 제거 (IIS에서 포트/HTTPS를 관리)
builder.WebHost.ConfigureKestrel(options =>
{
    options.AddServerHeader = false;
});

// ============================================================
// [A05] HSTS 서비스 설정 — Production 환경에서 UseHsts()에 적용
// max-age: 365일, includeSubDomains, preload 활성화
// RFC 6797 준수: 브라우저 HSTS Preload List 등록 요건 충족
// ============================================================
builder.Services.AddHsts(options =>
{
    options.MaxAge = TimeSpan.FromDays(365);         // 1년간 HTTPS 강제
    options.IncludeSubDomains = true;                // 모든 서브도메인에 적용
    options.Preload = true;                          // 브라우저 Preload List 등록 준비
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        context.Database.EnsureCreated(); // 자동으로 LocalDB와 테이블을 생성합니다.

        // [보안 개선] Admin 계정이 없을 때만 생성 (매 시작 시 삭제/재생성 방지)
        var adminExists = context.Users.Any(u => u.Role == "Admin");
        if (!adminExists)
        {
            var adminPassword = builder.Configuration["Admin:DefaultPassword"] ?? "Admin@Secure1!";
            context.Users.Add(new Project.Models.Entities.User
            {
                Email = builder.Configuration["Admin:Email"] ?? "admin",
                Name = "관리자",
                Nickname = "관리자",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword),
                Role = "Admin",
                CreatedAt = DateTime.UtcNow
            });
            context.SaveChanges();
            Log.Information("[보안] Admin 계정이 생성되었습니다. 즉시 비밀번호를 변경하세요.");
        }
    }
    catch (Exception ex)
    {
        Log.Error(ex, "데이터베이스 초기화 중 오류가 발생했습니다.");
    }
}

app.UseMiddleware<GlobalExceptionMiddleware>();

// ============================================================
// [A05] HSTS — Production 환경에서 HTTPS 강제 (Strict-Transport-Security)
// 브라우저가 이후 모든 요청을 HTTPS로만 전송하도록 강제합니다.
// preload 지시자로 브라우저 HSTS Preload List 등록을 준비합니다.
// ============================================================
if (app.Environment.IsProduction())
{
    app.UseHsts();
}

// [HTTPS] 개발 환경에서만 HTTPS 리다이렉션 (VMware IIS HTTP 배포 시 무한 리다이렉트 방지)
if (!app.Environment.IsProduction())
{
    app.UseHttpsRedirection();
}

// ============================================================
// [A05] 보안 헤더 & 정보 은닉 미들웨어
// - Server, X-Powered-By 헤더 제거 (서버 기술 스택 은닉)
// - 방어적 보안 헤더 전역 주입
// OnStarting 콜백을 사용하여 IIS가 후속 주입하는 헤더까지 차단합니다.
// ============================================================
app.Use(async (context, next) =>
{
    context.Response.OnStarting(() =>
    {
        // [A05] 서버 정보 은닉 — IIS/Kestrel이 주입하는 헤더 제거
        context.Response.Headers.Remove("Server");
        context.Response.Headers.Remove("X-Powered-By");
        context.Response.Headers.Remove("X-AspNet-Version");
        context.Response.Headers.Remove("X-AspNetMvc-Version");
        return Task.CompletedTask;
    });

    // [A05] 방어적 보안 헤더 주입
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
    // [A05] Content-Security-Policy: 외부 스크립트 로드 차단
    context.Response.Headers.Append("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; media-src 'self' blob:; connect-src 'self';");
    // [A05] Referrer-Policy: 외부 사이트로 내부 URL 유출 방지
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    // Permissions-Policy: 불필요한 브라우저 기능 비활성화
    context.Response.Headers.Append("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    await next();
});

// [배포] wwwroot에서 React 정적 파일 서비스 (index.html 자동 제공)
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseCors("StrictCorsPolicy");
app.UseRateLimiter(); // 속도 제한 미들웨어 등록

// CSRF 토큰 발급 엔드포인트 마련 (클라이언트가 앱 진입 시 호출하여 헤더로 사용)
app.MapGet("api/csrf-token", (IAntiforgery antiforgery, HttpContext context) =>
{
    var tokens = antiforgery.GetAndStoreTokens(context);
    return Results.Ok(new { csrfToken = tokens.RequestToken });
});

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// [배포] API 요청이 아닌 모든 경로는 React의 index.html로 넘김 (SPA 라우팅용)
app.MapFallbackToFile("/index.html");

app.Run();
