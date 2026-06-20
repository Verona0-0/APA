using System.Data;
using MySqlConnector;
using MyApp.Common;
using MyApp.Driver;

namespace MyApp.Driver.DB;

class DBSubscriptionPrices : IDBSubscriptionPrices
{
    private SubscriptionPrices FromReader(MySqlDataReader reader)
    {
        return new SubscriptionPrices
        {
            SubscriptionPricesID = (int)reader.GetInt64(reader.GetOrdinal("SubscriptionPricesID")),
            PublicationsID = (int)reader.GetInt64(reader.GetOrdinal("PublicationsID")),
            Date = reader.GetDateTime(reader.GetOrdinal("Date")),
            DateStart = reader.GetDateTime(reader.GetOrdinal("DateStart")),
            DateEnd = reader.IsDBNull(reader.GetOrdinal("DateEnd")) ? null : reader.GetDateTime(reader.GetOrdinal("DateEnd")),
            Price = (float)reader.GetDouble(reader.GetOrdinal("Price"))
        };
    }

    public void Delete(int id)
    {
        DAO.Instance.ExecuteNonQuery("DELETE FROM SubscriptionPrices WHERE SubscriptionPricesID = @id",
            new List<MySqlParameter> { new MySqlParameter("@id", id) });
    }

    public SubscriptionPrices? Get(int id)
    {
        return DAO.Instance.ReadSingle("SELECT SubscriptionPricesID, PublicationsID, Date, DateStart, DateEnd,Price FROM SubscriptionPrices WHERE SubscriptionPricesID = @id", FromReader,
            new List<MySqlParameter> { new MySqlParameter("@id", id) });
    }

    public List<SubscriptionPrices> Get()
    {
        return DAO.Instance.ExecuteReader("SELECT SubscriptionPricesID, PublicationsID, Date, DateStart, DateEnd, Price FROM SubscriptionPrices", FromReader);
    }

    public void Put(int id, SubscriptionPrices item)
    {
        var query = @"UPDATE SubscriptionPrices SET PublicationsID = @PublicationsID, Date = @Date, DateStart = @DateStart, DateEnd = @DateEnd, Price = @Price WHERE SubscriptionPricesID = @id";
        var parameters = new List<MySqlParameter>
        {
            new MySqlParameter("@PublicationsID", item.PublicationsID),
            new MySqlParameter("@Date", item.Date),
            new MySqlParameter("@DateStart", item.DateStart),
            new MySqlParameter("@DateEnd", (object?)item.DateEnd ?? DBNull.Value),
            new MySqlParameter("@Price", item.Price),
            new MySqlParameter("@id", id)
        };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }

    public void Post(SubscriptionPrices item)
    {
        var query = "INSERT INTO SubscriptionPrices (PublicationsID, Date, DateStart, DateEnd, Price) VALUES (@PublicationsID, @Date, @DateStart, @DateEnd, @Price)";
        var parameters = new List<MySqlParameter>
        {
            new MySqlParameter("@PublicationsID", item.PublicationsID),
            new MySqlParameter("@Date", item.Date),
            new MySqlParameter("@DateStart", item.DateStart),
            new MySqlParameter("@DateEnd", (object?)item.DateEnd ?? DBNull.Value),
            new MySqlParameter("@Price", item.Price)
        };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }
}
