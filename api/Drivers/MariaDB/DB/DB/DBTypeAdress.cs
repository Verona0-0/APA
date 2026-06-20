using MySqlConnector;
using MyApp.Common;
using MyApp.Driver;

namespace MyApp.Driver.DB;

class DBTypeAddress : IDBTypeAddress
{
    private TypeAddress FromReader(MySqlDataReader reader)
    {
        return new TypeAddress
        {
            TypeAddressID = (int)reader.GetInt64(reader.GetOrdinal("TypeAddressID")),
            Name = reader.GetString(reader.GetOrdinal("Name"))
        };
    }

    public void Delete(int id)
    {
        DAO.Instance.ExecuteNonQuery("DELETE FROM TypeAddress WHERE TypeAddressID = @id",
            new List<MySqlParameter> { new MySqlParameter("@id", id) });
    }

    public TypeAddress? Get(int id)
    {
        return DAO.Instance.ReadSingle("SELECT TypeAddressID, Name FROM TypeAddress WHERE TypeAddressID = @id", FromReader,
            new List<MySqlParameter> { new MySqlParameter("@id", id) });
    }

    public List<TypeAddress> Get()
    {
        return DAO.Instance.ExecuteReader("SELECT TypeAddressID, Name FROM TypeAddress", FromReader);
    }

    public void Put(int id, TypeAddress item)
    {
        var query = @"UPDATE TypeAddress SET Name = @Name WHERE TypeAddressID = @id";
        var parameters = new List<MySqlParameter>
        {
            new MySqlParameter("@Name", item.Name),
            new MySqlParameter("@id", id)
        };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }

    public void Post(TypeAddress item)
    {
        var query = "INSERT INTO TypeAddress (Name) VALUES (@Name)";
        var parameters = new List<MySqlParameter>
        {
            new MySqlParameter("@Name", item.Name)
        };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }
}
