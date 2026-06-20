using System.Data;
using MySqlConnector;
using MyApp.Common;
using MyApp.Driver;

namespace MyApp.Driver.DB;

class DBPublicationsCatalogs : IDBPublicationsCatalogs
{
    private PublicationsCatalogs FromReader(MySqlDataReader reader)
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
            new List<MySqlParameter> { new MySqlParameter("@id", id) });
    }

    public PublicationsCatalogs? Get(int id)
    {
        return DAO.Instance.ReadSingle("SELECT PublicationsCatalogsID,PublicationsID,CatalogsID FROM PublicationsCatalogs WHERE PublicationsCatalogsID = @id", FromReader,
            new List<MySqlParameter> { new MySqlParameter("@id", id) });
    }

    public List<PublicationsCatalogs> Get()
    {
        return DAO.Instance.ExecuteReader("SELECT PublicationsCatalogsID,PublicationsID,CatalogsID FROM PublicationsCatalogs", FromReader);
    }

    public void Put(int id, PublicationsCatalogs item)
    {
        var query = @"UPDATE PublicationsCatalogs SET PublicationsID = @PublicationsID, CatalogsID = @CatalogsID WHERE PublicationsCatalogsID = @id";
        var parameters = new List<MySqlParameter>
        {
            new MySqlParameter("@PublicationsID", item.PublicationsID),
            new MySqlParameter("@CatalogsID", item.CatalogsID),
            new MySqlParameter("@id", id)
        };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }

    public void Post(PublicationsCatalogs item)
    {
        var query = "INSERT INTO PublicationsCatalogs (PublicationsID, CatalogsID) VALUES (@PublicationsID, @CatalogsID)";
        var parameters = new List<MySqlParameter>
        {
            new MySqlParameter("@PublicationsID", item.PublicationsID),
            new MySqlParameter("@CatalogsID", item.CatalogsID)
        };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }
}
