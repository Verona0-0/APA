using System.Data;
using Microsoft.Data.Sqlite;
using MyApp.Common;


namespace MyApp.Driver.DB;

class DBPublicationsCatalogs : IDBPublicationsCatalogs
{
    private PublicationsCatalogs FromReader(SqliteDataReader reader)
    {
        return new PublicationsCatalogs
        {
            PublicationsCatalogsID = (int)reader.GetInt64(reader.GetOrdinal("PublicationsCatalogsID")),
            PublicationsID = (int)reader.GetInt64("PublicationsID"),
            CatalogsID = (int)reader.GetInt64("CatalogsID")
        };
    }

    public void Delete(int id)
    {
        DAO.Instance.ExecuteNonQuery("DELETE FROM PublicationsCatalogs WHERE PublicationsCatalogsID = @id",
            new List<SqliteParameter> { new SqliteParameter("@id", id) });
    }

    public PublicationsCatalogs? Get(int id)
    {
        return DAO.Instance.ReadSingle("SELECT PublicationsCatalogsID,PublicationsID,CatalogsID FROM PublicationsCatalogs WHERE PublicationsCatalogsID = @id", FromReader,
            new List<SqliteParameter> { new SqliteParameter("@id", id) });
    }

    public List<PublicationsCatalogs> Get()
    {
        return DAO.Instance.ExecuteReader("SELECT PublicationsCatalogsID,PublicationsID,CatalogsID FROM PublicationsCatalogs", FromReader);
    }

    public void Put(int id, PublicationsCatalogs item)
    {
        var query = @"UPDATE PublicationsCatalogs SET PublicationsID = @PublicationsID, CatalogsID = @CatalogsID WHERE PublicationsCatalogsID = @id";
        var parameters = new List<SqliteParameter>
            {
                new SqliteParameter("@PublicationsID", item.PublicationsID),
                new SqliteParameter("@CatalogsID", item.CatalogsID),
                new SqliteParameter("@id", id)
            };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }

    public void Post(PublicationsCatalogs item)
    {
        var query = "INSERT INTO PublicationsCatalogs (PublicationsID, CatalogsID) VALUES (@PublicationsID, @CatalogsID)";
        var parameters = new List<SqliteParameter>
            {
                new SqliteParameter("@PublicationsID", item.PublicationsID),
                new SqliteParameter("@CatalogsID", item.CatalogsID)
            };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }
}
