using MySqlConnector;
using MyApp.Common;
using MyApp.Driver;

namespace MyApp.Driver.DB;

class DBServices : IDBServices
{
    private Services FromReader(MySqlDataReader reader)
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
            new List<MySqlParameter> { new MySqlParameter("@id", id) });
    }

    public Services? Get(int id)
    {
        return DAO.Instance.ReadSingle("SELECT ServicesID,Name FROM Services WHERE ServicesID = @id", FromReader,
            new List<MySqlParameter> { new MySqlParameter("@id", id) });
    }

    public List<Services> Get()
    {
        return DAO.Instance.ExecuteReader("SELECT ServicesID,Name FROM Services", FromReader);
    }

    public void Put(int id, Services item)
    {
        var query = @"UPDATE Services SET Name = @Name WHERE ServicesID = @id";
        var parameters = new List<MySqlParameter>
        {
            new MySqlParameter("@Name", item.Name),
            new MySqlParameter("@id", id)
        };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }

    public void Post(Services item)
    {
        var query = "INSERT INTO Services (Name) VALUES (@Name)";
        var parameters = new List<MySqlParameter>
        {
            new MySqlParameter("@Name", item.Name)
        };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }
}
