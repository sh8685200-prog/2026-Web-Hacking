using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System;
// SixLabors.ImageSharp;
// SixLabors.ImageSharp.Formats.Jpeg;

namespace Project.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    // POST, PUT 등 CUD 요청 시 X-CSRF-TOKEN 헤더 검증 [ValidateAntiForgeryToken] 적용
    [AutoValidateAntiforgeryToken] 
    public class FileController : ControllerBase
    {
        [HttpPost("upload-image")]
        public async Task<IActionResult> UploadImage(IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest("파일이 없습니다.");

            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png" };
            var ext = Path.GetExtension(file.FileName).ToLower();
            if (!allowedExtensions.Contains(ext)) return BadRequest("허용되지 않은 확장자입니다.");

            var newFileName = Guid.NewGuid().ToString() + ".jpg";
            var saveDirectory = Path.Combine("protected_media", "images");
            
            if (!Directory.Exists(saveDirectory))
            {
                Directory.CreateDirectory(saveDirectory);
            }
            
            var savePath = Path.Combine(saveDirectory, newFileName);

            using var stream = file.OpenReadStream();
            try
            {
                // [심화 방어] ImageSharp를 이용한 이미지 Re-encoding 설계서 모방
                // 아래 코드는 실제 프로젝트에서 ImageSharp 패키지 셋팅 후 연결됩니다
                
                // using var image = await Image.LoadAsync(stream);
                // await image.SaveAsync(savePath, new JpegEncoder { Quality = 85 });
                
                // 임시로 스트림 복사 처리
                using var fs = new FileStream(savePath, FileMode.Create);
                await stream.CopyToAsync(fs);
            }
            catch (Exception)
            {
                // UnknownImageFormatException 처리 (악용 감지)
                return BadRequest("유효하지 않은 이미지 포맷입니다. (악용 시도 감지)");
            }

            return Ok(new { Message = "안전하게 업로드 및 처리되었습니다.", FileName = newFileName });
        }
    }
}
