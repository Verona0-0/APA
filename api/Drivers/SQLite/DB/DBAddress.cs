using System.Data;
using Microsoft.Data.Sqlite;
using MyApp.Common;


namespace MyApp.Driver.DB;

class DBDeliveryAddress : IDBDeliveryAddress
{
    private DeliveryAddress FromReader(SqliteDataReader reader)
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
            new List<SqliteParameter> { new SqliteParameter("@id", id) });
    }

    public DeliveryAddress? Get(int id)
    {
        return DAO.Instance.ReadSingle("SELECT DeliveryAddressID, ParentID,TypeAddressID,Name FROM DeliveryAddress WHERE DeliveryAddress = @id", FromReader,
            new List<SqliteParameter> { new SqliteParameter("@id", id) });
    }

    public List<DeliveryAddress> Get()
    {
        return DAO.Instance.ExecuteReader("SELECT DeliveryAddressID, ParentID,TypeAddressID,Name  FROM DeliveryAddress", FromReader);
    }

    public void Put(int id, DeliveryAddress item)
    {
        var query = @"UPDATE DeliveryAddress SET Name = @Name, ParentID = @ParentID, TypeAddressID = @TypeAddressID WHERE DeliveryAddressID = @id";
        var parameters = new List<SqliteParameter>
            {
                new SqliteParameter("@Name", item.Name),
                new SqliteParameter("@ParentID", item.ParentID),
                new SqliteParameter("@TypeAddressID", item.TypeAddressID),
                new SqliteParameter("@id", id)
            };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }

    public void Post(DeliveryAddress item)
    {
        var query = "INSERT INTO DeliveryAddress (Name, ParentID, TypeAddressID) VALUES (@Name, @ParentID, @TypeAddressID)";
        var parameters = new List<SqliteParameter>
            {
                new SqliteParameter("@Name", item.Name),
                new SqliteParameter("@ParentID", item.ParentID),
                new SqliteParameter("@TypeAddressID", item.TypeAddressID)
            };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }
}
