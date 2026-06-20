using System.Data;
using Microsoft.Data.Sqlite;
using MyApp.Common;
using MyApp.Driver;


class DBCatalogs : IDBCatalogs
{
    private Catalogs FromReader(SqliteDataReader reader)
    {
        return new Catalogs
        {
            CatalogsID = (int)reader.GetInt64("CatalogsID"),
            Name = reader.GetString("Name"),
            DateStart = reader.GetDateTime(reader.GetOrdinal("DateStart")),
            DateEnd = reader.IsDBNull(reader.GetOrdinal("DateEnd")) ? null : reader.GetDateTime(reader.GetOrdinal("DateEnd"))
        };
    }

    public void Delete(int id)
    {
        DAO.Instance.ExecuteNonQuery("DELETE FROM Catalogs WHERE CatalogsID = @id",
            new List<SqliteParameter> { new SqliteParameter("@id", id) });
    }

    public Catalogs? Get(int id)
    {
        return DAO.Instance.ReadSingle("SELECT CatalogsID,Name,DateStart,DateEnd  FROM Catalogs WHERE CatalogsID = @id", FromReader,
            new List<SqliteParameter> { new SqliteParameter("@id", id) });
    }

    public List<Catalogs> Get()
    {
        return DAO.Instance.ExecuteReader("SELECT CatalogsID,Name,DateStart,DateEnd  FROM Catalogs", FromReader);
    }

    public void Put(int id, Catalogs item)
    {
        var query = @"UPDATE Catalogs SET Name = @Name, DateStart = @DateStart, DateEnd = @DateEnd WHERE CatalogsID = @id";
        var parameters = new List<SqliteParameter>
            {
                new SqliteParameter("@Name", item.Name),
                new SqliteParameter("@DateStart", item.DateStart),
                new SqliteParameter("@DateEnd", (object?)item.DateEnd ?? DBNull.Value),
                new SqliteParameter("@id", id)
            };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }

    public void Post(Catalogs item)
    {
        var query = "INSERT INTO Catalogs (Name, DateStart, DateEnd) VALUES (@Name, @DateStart, @DateEnd)";
        var parameters = new List<SqliteParameter>
            {
                new SqliteParameter("@Name", item.Name),
                new SqliteParameter("@DateStart", item.DateStart),
                new SqliteParameter("@DateEnd", (object?)item.DateEnd ?? DBNull.Value)
            };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }
}