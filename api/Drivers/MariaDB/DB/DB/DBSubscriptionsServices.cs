using MySqlConnector;
using MyApp.Common;
using MyApp.Driver;

namespace MyApp.Driver.DB;

class DBSubscriptionServices : IDBSubscriptionServices
{
    private SubscriptionServices FromReader(MySqlDataReader reader)
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
            new List<MySqlParameter> { new MySqlParameter("@id", id) });
    }

    public SubscriptionServices? Get(int id)
    {
        return DAO.Instance.ReadSingle("SELECT SubscriptionServicesID, SubscriptionID, ServicesID FROM SubscriptionServices WHERE SubscriptionServicesID = @id", FromReader,
            new List<MySqlParameter> { new MySqlParameter("@id", id) });
    }

    public List<SubscriptionServices> Get()
    {
        return DAO.Instance.ExecuteReader("SELECT SubscriptionServicesID, SubscriptionID, ServicesID FROM SubscriptionServices", FromReader);
    }

    public void Put(int id, SubscriptionServices item)
    {
        var query = @"UPDATE SubscriptionServices SET SubscriptionID = @SubscriptionID, ServicesID = @ServicesID WHERE SubscriptionServicesID = @id";
        var parameters = new List<MySqlParameter>
        {
            new MySqlParameter("@SubscriptionID", item.SubscriptionID),
            new MySqlParameter("@ServicesID", item.ServicesID),
            new MySqlParameter("@id", id)
        };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }

    public void Post(SubscriptionServices item)
    {
        var query = "INSERT INTO SubscriptionServices (SubscriptionID, ServicesID) VALUES (@SubscriptionID, @ServicesID)";
        var parameters = new List<MySqlParameter>
        {
            new MySqlParameter("@SubscriptionID", item.SubscriptionID),
            new MySqlParameter("@ServicesID", item.ServicesID)
        };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }
}
