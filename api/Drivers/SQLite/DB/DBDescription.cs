using Microsoft.Data.Sqlite;
using MyApp.Common;


namespace MyApp.Driver.DB;

class DBDescription : IDBDescription
{
    private Description FromReader(SqliteDataReader reader)
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
            new List<SqliteParameter> { new SqliteParameter("@id", id) });
    }

    public Description? Get(int id)
    {
        return DAO.Instance.ReadSingle("SELECT DescriptionID,PublicationsID,TypeDescriptionID,Name FROM Description WHERE DescriptionID = @id", FromReader,
            new List<SqliteParameter> { new SqliteParameter("@id", id) });
    }

    public List<Description> Get()
    {
        return DAO.Instance.ExecuteReader("SELECT DescriptionID,PublicationsID,TypeDescriptionID,Name FROM Description", FromReader);
    }

    public void Put(int id, Description item)
    {
        var query = @"UPDATE Description SET PublicationsID = @PublicationsID, TypeDescriptionID = @TypeDescriptionID, Name = @Name WHERE DescriptionID = @id";
        var parameters = new List<SqliteParameter>
            {
                new SqliteParameter("@PublicationsID", item.PublicationsID),
                new SqliteParameter("@TypeDescriptionID", item.TypeDescriptionID),
                new SqliteParameter("@Name", item.Name),
                new SqliteParameter("@id", id)
            };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }

    public void Post(Description item)
    {
        var query = "INSERT INTO Description (PublicationsID, TypeDescriptionID, Name) VALUES (@PublicationsID, @TypeDescriptionID, @Name)";
        var parameters = new List<SqliteParameter>
            {
                new SqliteParameter("@PublicationsID", item.PublicationsID),
                new SqliteParameter("@TypeDescriptionID", item.TypeDescriptionID),
                new SqliteParameter("@Name", item.Name)
            };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }
}