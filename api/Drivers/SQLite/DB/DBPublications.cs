using Microsoft.Data.Sqlite;
using MyApp.Common;


namespace MyApp.Driver.DB;

class DBPublications : IDBPublications
{
    private Publications FromReader(SqliteDataReader reader)
    {
        return new Publications
        {
            PublicationsID = (int)reader.GetInt64(reader.GetOrdinal("PublicationsID")),
            Name = reader.GetString(reader.GetOrdinal("Name")),
            CoverPath = reader.IsDBNull(reader.GetOrdinal("CoverPath")) ? null : reader.GetString(reader.GetOrdinal("CoverPath"))
        };
    }

    public void Delete(int id)
    {
        // FK-проверки в SQLite включены по умолчанию (Microsoft.Data.Sqlite),
        // поэтому перед удалением издания вычищаем все строки, ссылающиеся на него.
        // Каждый вызов получает свой экземпляр SqliteParameter: ADO.NET не позволяет
        // делить один объект параметра между несколькими командами.
        List<SqliteParameter> IdParam() => new() { new SqliteParameter("@id", id) };

        DAO.Instance.ExecuteNonQuery(
            "DELETE FROM SubscriptionServices WHERE SubscriptionID IN (SELECT SubscriptionsID FROM Subscriptions WHERE PublicationsID = @id)",
            IdParam());
        DAO.Instance.ExecuteNonQuery("DELETE FROM Subscriptions WHERE PublicationsID = @id", IdParam());
        DAO.Instance.ExecuteNonQuery("DELETE FROM SubscriptionPrices WHERE PublicationsID = @id", IdParam());
        DAO.Instance.ExecuteNonQuery("DELETE FROM Description WHERE PublicationsID = @id", IdParam());
        DAO.Instance.ExecuteNonQuery("DELETE FROM PublicationsCatalogs WHERE PublicationsID = @id", IdParam());
        DAO.Instance.ExecuteNonQuery("DELETE FROM Publications WHERE PublicationsID = @id", IdParam());
    }

    public Publications? Get(int id)
    {
        return DAO.Instance.ReadSingle("SELECT PublicationsID, Name, CoverPath FROM Publications WHERE PublicationsID = @id", FromReader,
            new List<SqliteParameter> { new SqliteParameter("@id", id) });
    }

    public List<Publications> Get()
    {
        return DAO.Instance.ExecuteReader("SELECT PublicationsID, Name, CoverPath FROM Publications", FromReader);
    }

    public void Put(int id, Publications item)
    {
        var query = @"UPDATE Publications SET Name = @Name WHERE PublicationsID = @id";
        var parameters = new List<SqliteParameter>
            {
                new SqliteParameter("@Name", item.Name),
                new SqliteParameter("@id", id)
            };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }

    public void Post(Publications item)
    {
        var query = "INSERT INTO Publications (Name) VALUES (@Name)";
        var parameters = new List<SqliteParameter>
            {
                new SqliteParameter("@Name", item.Name)
            };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }

    public void SetCover(int id, string? path)
    {
        var query = "UPDATE Publications SET CoverPath = @CoverPath WHERE PublicationsID = @id";
        var parameters = new List<SqliteParameter>
            {
                new SqliteParameter("@CoverPath", (object?)path ?? DBNull.Value),
                new SqliteParameter("@id", id)
            };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }
}
