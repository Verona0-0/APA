using System.Collections.Generic;
using MyApp.Common;

namespace MyApp.Common;

public interface IDBPublications: ITable<Publications>
{
    void SetCover(int id, string? path);
}