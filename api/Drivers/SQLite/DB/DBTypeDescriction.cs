using Microsoft.Data.Sqlite;
using MyApp.Common;

namespace MyApp.Driver.DB;

class DBTypeDescription : IDBTypeDescription
{
    private TypeDescription FromReader(SqliteDataReader reader)
    {
        return new TypeDescription
        {
            TypeDescriptionID = (int)reader.GetInt64(reader.GetOrdinal("TypeDescriptionID")),
            Name = reader.GetString(reader.GetOrdinal("Name"))
        };
    }

    public void Delete(int id)
    {
        DAO.Instance.ExecuteNonQuery("DELETE FROM TypeDescription WHERE TypeDescriptionID = @id",
            new List<SqliteParameter> { new SqliteParameter("@id", id) });
    }

    public TypeDescription? Get(int id)
    {
        return DAO.Instance.ReadSingle("SELECT TypeDescriptionID, Name FROM TypeDescription WHERE TypeDescriptionID = @id", FromReader,
            new List<SqliteParameter> { new SqliteParameter("@id", id) });
    }

    public List<TypeDescription> Get()
    {
        return DAO.Instance.ExecuteReader("SELECT TypeDescriptionID, Name FROM TypeDescription", FromReader);
    }

    public void Put(int id, TypeDescription item)
    {
        var query = @"UPDATE TypeDescription SET Name = @Name WHERE TypeDescriptionID = @id";
        var parameters = new List<SqliteParameter>
            {
                new SqliteParameter("@Name", item.Name),
                new SqliteParameter("@id", id)
            };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }

    public void Post(TypeDescription item)
    {
        var query = "INSERT INTO TypeDescription (Name) VALUES (@Name)";
        var parameters = new List<SqliteParameter>
            {
                new SqliteParameter("@Name", item.Name)
            };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }
}
