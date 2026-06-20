using MySqlConnector;
using MyApp.Common;
using MyApp.Driver;

namespace MyApp.Driver.DB;

class DBDescription : IDBDescription
{
    private Description FromReader(MySqlDataReader reader)
    {
        return new Description
        {
            DescriptionID = (int)reader.GetInt64(reader.GetOrdinal("DescriptionID")),
            PublicationsID = (int)reader.GetInt64(reader.GetOrdinal("PublicationsID")),
            TypeDescriptionID = (int)reader.GetInt64(reader.GetOrdinal("TypeDescriptionID")),
            Name = reader.GetString(reader.GetOrdinal("Name"))
        };
    }

    public void Delete(int id)
    {
        DAO.Instance.ExecuteNonQuery("DELETE FROM Description WHERE DescriptionID = @id",
            new List<MySqlParameter> { new MySqlParameter("@id", id) });
    }

    public Description? Get(int id)
    {
        return DAO.Instance.ReadSingle("SELECT DescriptionID,PublicationsID,TypeDescriptionID,Name FROM Description WHERE DescriptionID = @id", FromReader,
            new List<MySqlParameter> { new MySqlParameter("@id", id) });
    }

    public List<Description> Get()
    {
        return DAO.Instance.ExecuteReader("SELECT DescriptionID,PublicationsID,TypeDescriptionID,Name FROM Description", FromReader);
    }

    public void Put(int id, Description item)
    {
        var query = @"UPDATE Description SET PublicationsID = @PublicationsID, TypeDescriptionID = @TypeDescriptionID, Name = @Name WHERE DescriptionID = @id";
        var parameters = new List<MySqlParameter>
        {
            new MySqlParameter("@PublicationsID", item.PublicationsID),
            new MySqlParameter("@TypeDescriptionID", item.TypeDescriptionID),
            new MySqlParameter("@Name", item.Name),
            new MySqlParameter("@id", id)
        };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }

    public void Post(Description item)
    {
        var query = "INSERT INTO Description (PublicationsID, TypeDescriptionID, Name) VALUES (@PublicationsID, @TypeDescriptionID, @Name)";
        var parameters = new List<MySqlParameter>
        {
            new MySqlParameter("@PublicationsID", item.PublicationsID),
            new MySqlParameter("@TypeDescriptionID", item.TypeDescriptionID),
            new MySqlParameter("@Name", item.Name)
        };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }
}
