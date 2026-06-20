using Microsoft.Data.Sqlite;
using MyApp.Common;


namespace MyApp.Driver.DB;

class DBSubscriptionServices : IDBSubscriptionServices
{
    private SubscriptionServices FromReader(SqliteDataReader reader)
    {
        return new SubscriptionServices
        {
            SubscriptionServicesID = (int)reader.GetInt64(reader.GetOrdinal("SubscriptionServicesID")),
            SubscriptionID = (int)reader.GetInt64(reader.GetOrdinal("SubscriptionID")),
            ServicesID = (int)reader.GetInt64(reader.GetOrdinal("ServicesID"))
        };
    }

    public void Delete(int id)
    {
        DAO.Instance.ExecuteNonQuery("DELETE FROM SubscriptionServices WHERE SubscriptionServicesID = @id",
            new List<SqliteParameter> { new SqliteParameter("@id", id) });
    }

    public SubscriptionServices? Get(int id)
    {
        return DAO.Instance.ReadSingle("SELECT SubscriptionServicesID, SubscriptionID, ServicesID FROM SubscriptionServices WHERE SubscriptionServicesID = @id", FromReader,
            new List<SqliteParameter> { new SqliteParameter("@id", id) });
    }

    public List<SubscriptionServices> Get()
    {
        return DAO.Instance.ExecuteReader("SELECT SubscriptionServicesID, SubscriptionID, ServicesID FROM SubscriptionServices", FromReader);
    }

    public void Put(int id, SubscriptionServices item)
    {
        var query = @"UPDATE SubscriptionServices SET SubscriptionID = @SubscriptionID, ServicesID = @ServicesID WHERE SubscriptionServicesID = @id";
        var parameters = new List<SqliteParameter>
            {
                new SqliteParameter("@SubscriptionID", item.SubscriptionID),
                new SqliteParameter("@ServicesID", item.ServicesID),
                new SqliteParameter("@id", id)
            };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }

    public void Post(SubscriptionServices item)
    {
        var query = "INSERT INTO SubscriptionServices (SubscriptionID, ServicesID) VALUES (@SubscriptionID, @ServicesID)";
        var parameters = new List<SqliteParameter>
            {
                new SqliteParameter("@SubscriptionID", item.SubscriptionID),
                new SqliteParameter("@ServicesID", item.ServicesID)
            };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }
}