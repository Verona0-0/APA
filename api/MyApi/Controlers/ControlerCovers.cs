using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyApi.Storage;
using MyApi.Singletons;
using OpenIddict.Validation.AspNetCore;

namespace MyApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[Authorize(AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]
public class CoversController : ControllerBase
{
    private readonly IImageStorage _storage;
    private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
    private const long MaxFileSize = 10 * 1024 * 1024;

    public CoversController(IImageStorage storage) => _storage = storage;

    [HttpGet("{id}")]
    public async Task StreamCover(int id)
    {
        var pub = DAO.Instance.Publications.Get(id);
        if (pub?.CoverPath == null) { Response.StatusCode = 404; return; }

        // CoverPath хранит имя объекта в MinIO. Сначала узнаём его размер/тип/etag.
        var stat = await _storage.StatAsync(pub.CoverPath, HttpContext.RequestAborted);
        if (stat == null) { Response.StatusCode = 404; return; }

        var total = stat.Size;
        var etag  = $"\"{stat.ETag}\"";

        // Браузер уже держит эту версию в кэше — отдавать тело не нужно.
        if (Request.Headers.IfNoneMatch == etag) { Response.StatusCode = 304; return; }

        Response.Headers.AcceptRanges = "bytes";
        Response.Headers.ETag         = etag;
        Response.Headers.LastModified = stat.LastModified.ToUniversalTime().ToString("R");
        Response.ContentType          = string.IsNullOrEmpty(stat.ContentType) ? "application/octet-stream" : stat.ContentType;

        long from = 0, to = total - 1;
        var rangeHeader = Request.Headers.Range.ToString();

        // Поддержка частичной загрузки (перемотка, докачка): отдаём только запрошенный кусок.
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
        await _storage.StreamToAsync(pub.CoverPath, Response.Body, from, to - from + 1, HttpContext.RequestAborted);
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
        // Старый объект удаляем — у нового будет другое имя (новый GUID).
        if (pub.CoverPath != null) await _storage.DeleteAsync(pub.CoverPath, HttpContext.RequestAborted);
        return await SaveCover(id, file);
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "OperatorOrAdmin")]
    public async Task<IActionResult> Delete(int id)
    {
        var pub = DAO.Instance.Publications.Get(id);
        if (pub?.CoverPath == null) return NotFound();
        await _storage.DeleteAsync(pub.CoverPath, HttpContext.RequestAborted);
        DAO.Instance.Publications.SetCover(id, null);
        return NoContent();
    }

    private async Task<IActionResult> SaveCover(int id, IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest("Файл не предоставлен.");
        if (file.Length > MaxFileSize) return BadRequest($"Размер файла превышает {MaxFileSize / (1024 * 1024)} МБ.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
            return BadRequest($"Допустимые форматы: {string.Join(", ", AllowedExtensions)}.");

        var objectName = $"{Guid.NewGuid()}{ext}";

        // Поток запроса льём прямо в MinIO, минуя промежуточный файл и byte[].
        await using var upload = file.OpenReadStream();
        await _storage.SaveAsync(upload, objectName, ContentTypeFor(ext), file.Length, HttpContext.RequestAborted);

        DAO.Instance.Publications.SetCover(id, objectName);
        return Ok(new { objectName });
    }

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
