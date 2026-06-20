using System.Data;
using MySqlConnector;
using MyApp.Common;
using MyApp.Driver;

namespace MyApp.Driver.DB;

class DBSubscriptions : IDBSubscriptions
{
    private Subscriptions FromReader(MySqlDataReader reader)
    {
        return new Subscriptions
        {
            SubscriptionsID = (int)reader.GetInt64(reader.GetOrdinal("SubscriptionsID")),
            ClientID = (int)reader.GetInt64(reader.GetOrdinal("ClientID")),
            PublicationsID = (int)reader.GetInt64(reader.GetOrdinal("PublicationsID")),
            Date = reader.GetDateTime(reader.GetOrdinal("Date")),
            DateStart = reader.GetDateTime(reader.GetOrdinal("DateStart")),
            DateEnd = reader.IsDBNull(reader.GetOrdinal("DateEnd")) ? null : reader.GetDateTime(reader.GetOrdinal("DateEnd")),
            Price = (float)reader.GetDouble(reader.GetOrdinal("Price")),
            DeliveryAddressID = (int)reader.GetInt64(reader.GetOrdinal("DeliveryAddressID"))
        };
    }

    public void Delete(int id)
    {
        DAO.Instance.ExecuteNonQuery("DELETE FROM Subscriptions WHERE SubscriptionsID = @id",
            new List<MySqlParameter> { new MySqlParameter("@id", id) });
    }

    public Subscriptions? Get(int id)
    {
        return DAO.Instance.ReadSingle("SELECT ClientID,PublicationsID,Date,DateStart,DateEnd,Price,DeliveryAddressID FROM Subscriptions WHERE SubscriptionsID = @id", FromReader,
            new List<MySqlParameter> { new MySqlParameter("@id", id) });
    }

    public List<Subscriptions> Get()
    {
        return DAO.Instance.ExecuteReader("SELECT ClientID,PublicationsID,Date,DateStart,DateEnd,Price,DeliveryAddressID FROM Subscriptions", FromReader);
    }

    public void Put(int id, Subscriptions item)
    {
        var query = @"UPDATE Subscriptions SET ClientID = @ClientID, PublicationsID = @PublicationsID, Date = @Date, DateStart = @DateStart, DateEnd = @DateEnd, Price = @Price, DeliveryAddressID = @DeliveryAddressID WHERE SubscriptionsID = @id";
        var parameters = new List<MySqlParameter>
        {
            new MySqlParameter("@ClientID", item.ClientID),
            new MySqlParameter("@PublicationsID", item.PublicationsID),
            new MySqlParameter("@Date", item.Date),
            new MySqlParameter("@DateStart", item.DateStart),
            new MySqlParameter("@DateEnd", (object?)item.DateEnd ?? DBNull.Value),
            new MySqlParameter("@Price", item.Price),
            new MySqlParameter("@DeliveryAddressID", item.DeliveryAddressID),
            new MySqlParameter("@id", id)
        };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }

    public void Post(Subscriptions item)
    {
        var query = @"INSERT INTO Subscriptions (ClientID, PublicationsID, Date, DateStart, DateEnd, Price, DeliveryAddressID) VALUES (@ClientID, @PublicationsID, @Date, @DateStart, @DateEnd, @Price, @DeliveryAddressID)";
        var parameters = new List<MySqlParameter>
        {
            new MySqlParameter("@ClientID", item.ClientID),
            new MySqlParameter("@PublicationsID", item.PublicationsID),
            new MySqlParameter("@Date", item.Date),
            new MySqlParameter("@DateStart", item.DateStart),
            new MySqlParameter("@DateEnd", (object?)item.DateEnd ?? DBNull.Value),
            new MySqlParameter("@Price", item.Price),
            new MySqlParameter("@DeliveryAddressID", item.DeliveryAddressID)
        };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }
}
