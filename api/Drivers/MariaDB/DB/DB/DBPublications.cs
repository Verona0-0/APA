using MySqlConnector;
using MyApp.Common;
using MyApp.Driver;

namespace MyApp.Driver.DB;

class DBPublications : IDBPublications
{
    private Publications FromReader(MySqlDataReader reader)
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
        // Перед удалением издания вычищаем все строки, ссылающиеся на него через FK,
        // иначе MariaDB откажется выполнять DELETE. Каждый вызов получает свой
        // экземпляр MySqlParameter — ADO.NET не позволяет делить параметр между командами.
        List<MySqlParameter> IdParam() => new() { new MySqlParameter("@id", id) };

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
            new List<MySqlParameter> { new MySqlParameter("@id", id) });
    }

    public List<Publications> Get()
    {
        return DAO.Instance.ExecuteReader("SELECT PublicationsID, Name, CoverPath FROM Publications", FromReader);
    }

    public void Put(int id, Publications item)
    {
        var query = @"UPDATE Publications SET Name = @Name WHERE PublicationsID = @id";
        var parameters = new List<MySqlParameter>
        {
            new MySqlParameter("@Name", item.Name),
            new MySqlParameter("@id", id)
        };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }

    public void Post(Publications item)
    {
        var query = "INSERT INTO Publications (Name) VALUES (@Name)";
        var parameters = new List<MySqlParameter>
        {
            new MySqlParameter("@Name", item.Name)
        };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }

    public void SetCover(int id, string? path)
    {
        var query = "UPDATE Publications SET CoverPath = @CoverPath WHERE PublicationsID = @id";
        var parameters = new List<MySqlParameter>
        {
            new MySqlParameter("@CoverPath", (object?)path ?? DBNull.Value),
            new MySqlParameter("@id", id)
        };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }
}
