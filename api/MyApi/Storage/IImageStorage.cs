namespace MyApi.Storage;

// Метаданные объекта в хранилище — нужны контроллеру для заголовков ответа
// (Content-Length, ETag, Last-Modified) и для обработки Range-запросов.
public record ObjectInfo(long Size, string ContentType, DateTime LastModified, string ETag);

// Абстракция над хранилищем картинок. Реализация (MinIO) работает потоково:
// данные не загружаются в память целиком, а идут Stream -> Stream.
public interface IImageStorage
{
    // Создать бакет, если его ещё нет. Вызывается один раз при старте.
    Task EnsureBucketAsync(CancellationToken ct = default);

    // Залить объект из потока. size — известный размер (из IFormFile.Length / файла).
    Task SaveAsync(Stream content, string objectName, string contentType, long size, CancellationToken ct = default);

    // Метаданные объекта или null, если его нет.
    Task<ObjectInfo?> StatAsync(string objectName, CancellationToken ct = default);

    // Перелить кусок объекта [offset, offset+length) прямо в destination (Response.Body).
    Task StreamToAsync(string objectName, Stream destination, long offset, long length, CancellationToken ct = default);

    Task DeleteAsync(string objectName, CancellationToken ct = default);

    Task<bool> ExistsAsync(string objectName, CancellationToken ct = default);
}
