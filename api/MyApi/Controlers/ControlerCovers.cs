using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyApi.Singletons;
using OpenIddict.Validation.AspNetCore;

namespace MyApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[Authorize(AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]
public class CoversController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
    private const long MaxFileSize = 10 * 1024 * 1024;
    private const int  ChunkSize   = 64 * 1024;

    public CoversController(IWebHostEnvironment env) => _env = env;

    [HttpGet("{id}")]
    public async Task StreamCover(int id)
    {
        var pub = DAO.Instance.Publications.Get(id);
        if (pub?.CoverPath == null) { Response.StatusCode = 404; return; }

        var fullPath = Path.Combine(WebRoot, pub.CoverPath);
        if (!new FileInfo(fullPath).Exists) { Response.StatusCode = 404; return; }

        var info  = new FileInfo(fullPath);
        var total = info.Length;
        var etag  = $"\"{total}-{info.LastWriteTimeUtc.Ticks}\"";

        if (Request.Headers.IfNoneMatch == etag) { Response.StatusCode = 304; return; }

        Response.Headers.AcceptRanges = "bytes";
        Response.Headers.ETag         = etag;
        Response.Headers.LastModified = info.LastWriteTimeUtc.ToString("R");
        Response.ContentType          = ContentTypeFor(Path.GetExtension(fullPath));

        long from = 0, to = total - 1;
        var rangeHeader = Request.Headers.Range.ToString();

        if (!string.IsNullOrEmpty(rangeHeader))
        {
            if (!TryParseRange(rangeHeader, total, out from, out to) || from > to || to >= total)
            {
                Response.StatusCode           = 416;
                Response.Headers.ContentRange = $"bytes */{total}";
                return;
            }
            Response.StatusCode           = 206;
            Response.Headers.ContentRange = $"bytes {from}-{to}/{total}";
        }
        else Response.StatusCode = 200;

        Response.ContentLength = to - from + 1;
        await StreamAsync(fullPath, from, to - from + 1, HttpContext.RequestAborted);
    }

    [HttpPost("{id}")]
    [Authorize(Policy = "OperatorOrAdmin")]
    public async Task<IActionResult> Post(int id, IFormFile file)
    {
        var pub = DAO.Instance.Publications.Get(id);
        if (pub == null) return NotFound();
        if (pub.CoverPath != null) return Conflict("Обложка уже существует. Для замены используйте PUT.");
        return await SaveCover(id, file);
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "OperatorOrAdmin")]
    public async Task<IActionResult> Put(int id, IFormFile file)
    {
        var pub = DAO.Instance.Publications.Get(id);
        if (pub == null) return NotFound();
        if (pub.CoverPath != null) RemoveFile(pub.CoverPath);
        return await SaveCover(id, file);
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "OperatorOrAdmin")]
    public IActionResult Delete(int id)
    {
        var pub = DAO.Instance.Publications.Get(id);
        if (pub?.CoverPath == null) return NotFound();
        RemoveFile(pub.CoverPath);
        DAO.Instance.Publications.SetCover(id, null);
        return NoContent();
    }

    private async Task StreamAsync(string path, long offset, long length, CancellationToken ct)
    {
        var buffer = new byte[ChunkSize];
        await using var fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, ChunkSize, useAsync: true);
        fs.Seek(offset, SeekOrigin.Begin);

        long remaining = length;
        while (remaining > 0 && !ct.IsCancellationRequested)
        {
            var read = await fs.ReadAsync(buffer.AsMemory(0, (int)Math.Min(ChunkSize, remaining)), ct);
            if (read == 0) break;
            await Response.Body.WriteAsync(buffer.AsMemory(0, read), ct);
            await Response.Body.FlushAsync(ct);
            remaining -= read;
        }
    }

    private async Task<IActionResult> SaveCover(int id, IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest("Файл не предоставлен.");
        if (file.Length > MaxFileSize) return BadRequest($"Размер файла превышает {MaxFileSize / (1024 * 1024)} МБ.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
            return BadRequest($"Допустимые форматы: {string.Join(", ", AllowedExtensions)}.");

        Directory.CreateDirectory(Path.Combine(WebRoot, "covers"));

        var fileName     = $"{Guid.NewGuid()}{ext}";
        var relativePath = Path.Combine("covers", fileName);

        await using (var stream = new FileStream(Path.Combine(WebRoot, relativePath), FileMode.Create))
            await file.CopyToAsync(stream);

        DAO.Instance.Publications.SetCover(id, relativePath);
        return Ok(new { url = $"/covers/{fileName}" });
    }

    private void RemoveFile(string relativePath)
    {
        var full = Path.Combine(WebRoot, relativePath);
        var fi = new FileInfo(full);
        if (fi.Exists) fi.Delete();
    }

    private string WebRoot =>
        _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");

    private static string ContentTypeFor(string ext) => ext.ToLowerInvariant() switch
    {
        ".jpg" or ".jpeg" => "image/jpeg",
        ".png"            => "image/png",
        ".webp"           => "image/webp",
        ".gif"            => "image/gif",
        _                 => "application/octet-stream"
    };

    private static bool TryParseRange(string header, long total, out long from, out long to)
    {
        from = 0; to = total - 1;
        var parts = header.Replace("bytes=", "").Trim().Split('-');
        if (parts.Length != 2) return false;

        if (string.IsNullOrEmpty(parts[0]))
        {
            if (!long.TryParse(parts[1], out var suffix)) return false;
            from = Math.Max(0, total - suffix);
            return true;
        }

        if (!long.TryParse(parts[0], out from)) return false;
        to = string.IsNullOrEmpty(parts[1]) ? total - 1
        : long.TryParse(parts[1], out var end) ? end : total - 1;
        return true;
    }
}
