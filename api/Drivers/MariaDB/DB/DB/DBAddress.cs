using System.Data;
using System.Collections.Generic;
using MySqlConnector;
using MyApp.Common;
using MyApp.Driver;

namespace MyApp.Driver.DB;

class DBDeliveryAddress : IDBDeliveryAddress
{
    private DeliveryAddress FromReader(MySqlDataReader reader)
    {
        return new DeliveryAddress
        {
            DeliveryAddressID = (int)reader.GetInt64("DeliveryAddressID"),
            ParentID = (int)reader.GetInt64("ParentID"),
            TypeAddressID = (int)reader.GetInt64("TypeAddressID"),
            Name = reader.GetString("Name")
        };
    }

    public void Delete(int id)
    {
        DAO.Instance.ExecuteNonQuery("DELETE FROM DeliveryAddress WHERE DeliveryAddressID = @id",
            new List<MySqlParameter> { new MySqlParameter("@id", id) });
    }

    public DeliveryAddress? Get(int id)
    {
        return DAO.Instance.ReadSingle("SELECT DeliveryAddressID, ParentID, TypeAddressID, Name FROM DeliveryAddress WHERE DeliveryAddressID = @id", FromReader,
            new List<MySqlParameter> { new MySqlParameter("@id", id) });
    }

    public List<DeliveryAddress> Get()
    {
        return DAO.Instance.ExecuteReader("SELECT DeliveryAddressID, ParentID, TypeAddressID, Name FROM DeliveryAddress", FromReader);
    }

    public void Put(int id, DeliveryAddress item)
    {
        var query = @"UPDATE DeliveryAddress SET Name = @Name, ParentID = @ParentID, TypeAddressID = @TypeAddressID WHERE DeliveryAddressID = @id";
        var parameters = new List<MySqlParameter>
        {
            new MySqlParameter("@Name", item.Name),
            new MySqlParameter("@ParentID", item.ParentID),
            new MySqlParameter("@TypeAddressID", item.TypeAddressID),
            new MySqlParameter("@id", id)
        };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }

    public void Post(DeliveryAddress item)
    {
        var query = "INSERT INTO DeliveryAddress (Name, ParentID, TypeAddressID) VALUES (@Name, @ParentID, @TypeAddressID)";
        var parameters = new List<MySqlParameter>
        {
            new MySqlParameter("@Name", item.Name),
            new MySqlParameter("@ParentID", item.ParentID),
            new MySqlParameter("@TypeAddressID", item.TypeAddressID)
        };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }
}