using Microsoft.EntityFrameworkCore;
using Project.Models.Entities;

namespace Project.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<Board> Boards { get; set; }
        public DbSet<Comment> Comments { get; set; }
        public DbSet<MusicFile> MusicFiles { get; set; }

        // ── 음악 스트리밍 엔티티 ──
        public DbSet<Artist> Artists { get; set; }
        public DbSet<Album> Albums { get; set; }
        public DbSet<Track> Tracks { get; set; }

        // ── 좋아요(보관함) 연결 테이블 ──
        public DbSet<UserLikedTrack> UserLikedTracks { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            // Unique constraint on Email
            modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();

            // ── Artist → Album (1:N, Cascade Delete) ──
            modelBuilder.Entity<Album>()
                .HasOne(a => a.Artist)
                .WithMany(ar => ar.Albums)
                .HasForeignKey(a => a.ArtistId)
                .OnDelete(DeleteBehavior.Cascade);

            // ── Album → Track (1:N, Cascade Delete) ──
            modelBuilder.Entity<Track>()
                .HasOne(t => t.Album)
                .WithMany(a => a.Tracks)
                .HasForeignKey(t => t.AlbumId)
                .OnDelete(DeleteBehavior.Cascade);

            // ── Board → Artist (N:1) ──
            modelBuilder.Entity<Board>()
                .HasOne(b => b.Artist)
                .WithMany()
                .HasForeignKey(b => b.ArtistId)
                .OnDelete(DeleteBehavior.Cascade);

            // ── Board → User (N:1) ──
            modelBuilder.Entity<Board>()
                .HasOne(b => b.User)
                .WithMany()
                .HasForeignKey(b => b.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // ── Board → Comments (1:N, Cascade Delete) ──
            modelBuilder.Entity<Comment>()
                .HasOne(c => c.Board)
                .WithMany(b => b.Comments)
                .HasForeignKey(c => c.BoardId)
                .OnDelete(DeleteBehavior.Cascade);

            // ── Comment → User (N:1) ──
            modelBuilder.Entity<Comment>()
                .HasOne(c => c.User)
                .WithMany()
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Restrict); // 유저 삭제 시 댓글은 보존

            // ── UserLikedTrack 복합 키 (N:M 조인 테이블) ──
            modelBuilder.Entity<UserLikedTrack>()
                .HasKey(ult => new { ult.UserId, ult.TrackId });

            modelBuilder.Entity<UserLikedTrack>()
                .HasOne(ult => ult.User)
                .WithMany()
                .HasForeignKey(ult => ult.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserLikedTrack>()
                .HasOne(ult => ult.Track)
                .WithMany()
                .HasForeignKey(ult => ult.TrackId)
                .OnDelete(DeleteBehavior.Cascade);

            // ── 인덱스 최적화 ──
            modelBuilder.Entity<Artist>().HasIndex(a => a.Name);
            modelBuilder.Entity<Album>().HasIndex(a => a.Title);
            modelBuilder.Entity<Track>().HasIndex(t => t.Title);
            modelBuilder.Entity<Board>().HasIndex(b => b.ArtistId);
            modelBuilder.Entity<Board>().HasIndex(b => b.CreatedAt);
            modelBuilder.Entity<Comment>().HasIndex(c => c.BoardId);
        }
    }
}
