namespace Project.Models.Entities
{
    public class MusicFile
    {
        public int Id { get; set; }
        public string OriginalFileName { get; set; } = string.Empty;
        public string StoredFilePath { get; set; } = string.Empty;
        public long FileSizeBytes { get; set; }
        public string ChecksumHash { get; set; } = string.Empty; // A08: Integrity Guarantee
    }
}
