using Microsoft.Data.Sqlite;
using MyApp.Common;


namespace MyApp.Driver.DB;

class DBSubscriptions : IDBSubscriptions
{
    private Subscriptions FromReader(SqliteDataReader reader)
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
            new List<SqliteParameter> { new SqliteParameter("@id", id) });
    }

    public Subscriptions? Get(int id)
    {
        return DAO.Instance.ReadSingle("SELECT SubscriptionsID, ClientID,PublicationsID,Date,DateStart,DateEnd,Price,DeliveryAddressID FROM Subscriptions WHERE SubscriptionsID = @id", FromReader,
            new List<SqliteParameter> { new SqliteParameter("@id", id) });
    }

    public List<Subscriptions> Get()
    {
        return DAO.Instance.ExecuteReader("SELECT SubscriptionsID, ClientID,PublicationsID,Date,DateStart,DateEnd,Price,DeliveryAddressID FROM Subscriptions", FromReader);
    }

    public void Put(int id, Subscriptions item)
    {
        var query = @"UPDATE Subscriptions SET ClientID = @ClientID, PublicationsID = @PublicationsID, Date = @Date, DateStart = @DateStart, DateEnd = @DateEnd, Price = @Price, DeliveryAddressID = @DeliveryAddressID WHERE SubscriptionsID = @id";
        var parameters = new List<SqliteParameter>
            {
                new SqliteParameter("@ClientID", item.ClientID),
                new SqliteParameter("@PublicationsID", item.PublicationsID),
                new SqliteParameter("@Date", item.Date),
                new SqliteParameter("@DateStart", item.DateStart),
                new SqliteParameter("@DateEnd", (object?)item.DateEnd ?? DBNull.Value),
                new SqliteParameter("@Price", item.Price),
                new SqliteParameter("@DeliveryAddressID", item.DeliveryAddressID),
                new SqliteParameter("@id", id)
            };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }

    public void Post(Subscriptions item)
    {
        var query = @"INSERT INTO Subscriptions (ClientID, PublicationsID, Date, DateStart, DateEnd, Price, DeliveryAddressID) VALUES (@ClientID, @PublicationsID, @Date, @DateStart, @DateEnd, @Price, @DeliveryAddressID)";
        var parameters = new List<SqliteParameter>
            {
                new SqliteParameter("@ClientID", item.ClientID),
                new SqliteParameter("@PublicationsID", item.PublicationsID),
                new SqliteParameter("@Date", item.Date),
                new SqliteParameter("@DateStart", item.DateStart),
                new SqliteParameter("@DateEnd", (object?)item.DateEnd ?? DBNull.Value),
                new SqliteParameter("@Price", item.Price),
                new SqliteParameter("@DeliveryAddressID", item.DeliveryAddressID)
            };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }
}