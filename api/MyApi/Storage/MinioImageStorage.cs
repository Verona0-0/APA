using Minio;
using Minio.DataModel.Args;
using Minio.Exceptions;

namespace MyApi.Storage;

// Хранилище обложек поверх MinIO. Всё чтение/запись идёт потоком,
// поэтому большой файл не оседает в памяти приложения целиком.
public class MinioImageStorage : IImageStorage
{
    private readonly IMinioClient _minio;
    private readonly string _bucket;

    public MinioImageStorage(IMinioClient minio, IConfiguration config)
    {
        _minio  = minio;
        _bucket = config["Minio:Bucket"] ?? "covers";
    }

    public async Task EnsureBucketAsync(CancellationToken ct = default)
    {
        var exists = await _minio.BucketExistsAsync(
            new BucketExistsArgs().WithBucket(_bucket), ct);
        if (!exists)
            await _minio.MakeBucketAsync(new MakeBucketArgs().WithBucket(_bucket), ct);
    }

    public async Task SaveAsync(Stream content, string objectName, string contentType, long size, CancellationToken ct = default)
    {
        await _minio.PutObjectAsync(new PutObjectArgs()
            .WithBucket(_bucket)
            .WithObject(objectName)
            .WithStreamData(content)   // отдаём поток как есть, без буферизации в byte[]
            .WithObjectSize(size)
            .WithContentType(contentType), ct);
    }

    public async Task<ObjectInfo?> StatAsync(string objectName, CancellationToken ct = default)
    {
        try
        {
            var stat = await _minio.StatObjectAsync(new StatObjectArgs()
                .WithBucket(_bucket)
                .WithObject(objectName), ct);

            return new ObjectInfo(stat.Size, stat.ContentType, stat.LastModified, stat.ETag);
        }
        catch (ObjectNotFoundException)
        {
            return null;
        }
    }

    public async Task StreamToAsync(string objectName, Stream destination, long offset, long length, CancellationToken ct = default)
    {
        // MinIO отдаёт объект в callback как поток — сразу переливаем его в destination
        // (это Response.Body контроллера). Получается сквозной стрим MinIO -> клиент.
        await _minio.GetObjectAsync(new GetObjectArgs()
            .WithBucket(_bucket)
            .WithObject(objectName)
            .WithOffsetAndLength(offset, length)
            .WithCallbackStream(async (stream, token) => await stream.CopyToAsync(destination, token)), ct);
    }

    public async Task DeleteAsync(string objectName, CancellationToken ct = default)
    {
        await _minio.RemoveObjectAsync(new RemoveObjectArgs()
            .WithBucket(_bucket)
            .WithObject(objectName), ct);
    }

    public async Task<bool> ExistsAsync(string objectName, CancellationToken ct = default)
    {
        try
        {
            await _minio.StatObjectAsync(new StatObjectArgs()
                .WithBucket(_bucket)
                .WithObject(objectName), ct);
            return true;
        }
        catch (ObjectNotFoundException)
        {
            return false;
        }
    }
}
