using Microsoft.Data.Sqlite;
using MyApp.Common;


namespace MyApp.Driver.DB;

class DBServices : IDBServices
{
    private Services FromReader(SqliteDataReader reader)
    {
        return new Services
        {
            ServicesID = (int)reader.GetInt64(reader.GetOrdinal("ServicesID")),
            Name = reader.GetString(reader.GetOrdinal("Name"))
        };
    }

    public void Delete(int id)
    {
        DAO.Instance.ExecuteNonQuery("DELETE FROM Services WHERE ServicesID = @id",
            new List<SqliteParameter> { new SqliteParameter("@id", id) });
    }

    public Services? Get(int id)
    {
        return DAO.Instance.ReadSingle("SELECT ServicesID,Name FROM Services WHERE ServicesID = @id", FromReader,
            new List<SqliteParameter> { new SqliteParameter("@id", id) });
    }

    public List<Services> Get()
    {
        return DAO.Instance.ExecuteReader("SELECT ServicesID,Name FROM Services", FromReader);
    }

    public void Put(int id, Services item)
    {
        var query = @"UPDATE Services SET Name = @Name WHERE ServicesID = @id";
        var parameters = new List<SqliteParameter>
            {
                new SqliteParameter("@Name", item.Name),
                new SqliteParameter("@id", id)
            };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }

    public void Post(Services item)
    {
        var query = "INSERT INTO Services (Name) VALUES (@Name)";
        var parameters = new List<SqliteParameter>
            {
                new SqliteParameter("@Name", item.Name)
            };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }
}