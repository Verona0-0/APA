using Microsoft.Data.Sqlite;
using MyApp.Common;

namespace MyApp.Driver.DB;

class DBTypeAddress : IDBTypeAddress
{
    private TypeAddress FromReader(SqliteDataReader reader)
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
            new List<SqliteParameter> { new SqliteParameter("@id", id) });
    }

    public TypeAddress? Get(int id)
    {
        return DAO.Instance.ReadSingle("SELECT TypeAddressID, Name FROM TypeAddress WHERE TypeAddressID = @id", FromReader,
            new List<SqliteParameter> { new SqliteParameter("@id", id) });
    }

    public List<TypeAddress> Get()
    {
        return DAO.Instance.ExecuteReader("SELECT TypeAddressID, Name FROM TypeAddress", FromReader);
    }

    public void Put(int id, TypeAddress item)
    {
        var query = @"UPDATE TypeAddress SET Name = @Name WHERE TypeAddressID = @id";
        var parameters = new List<SqliteParameter>
            {
                new SqliteParameter("@Name", item.Name),
                new SqliteParameter("@id", id)
            };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }

    public void Post(TypeAddress item)
    {
        var query = "INSERT INTO TypeAddress (Name) VALUES (@Name)";
        var parameters = new List<SqliteParameter>
            {
                new SqliteParameter("@Name", item.Name)
            };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }
}