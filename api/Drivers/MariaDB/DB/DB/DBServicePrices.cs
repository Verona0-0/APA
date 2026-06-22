using System.Data;
using MySqlConnector;
using MyApp.Common;
using MyApp.Driver;

namespace MyApp.Driver.DB;

class DBServicePrices : IDBServicePrices
{
    private ServicePrices FromReader(MySqlDataReader reader)
    {
        return new ServicePrices
        {
            ServicePricesID = (int)reader.GetInt64(reader.GetOrdinal("ServicePricesID")),
            ServicesID = (int)reader.GetInt64(reader.GetOrdinal("ServicesID")),
            Date = reader.GetDateTime(reader.GetOrdinal("Date")),
            DateStart = reader.GetDateTime(reader.GetOrdinal("DateStart")),
            DateEnd = reader.IsDBNull(reader.GetOrdinal("DateEnd")) ? null : reader.GetDateTime(reader.GetOrdinal("DateEnd")),
            Price = (float)reader.GetDouble(reader.GetOrdinal("Price"))
        };
    }

    public void Delete(int id)
    {
        DAO.Instance.ExecuteNonQuery("DELETE FROM ServicePrices WHERE ServicePricesID = @id",
            new List<MySqlParameter> { new MySqlParameter("@id", id) });
    }

    public ServicePrices? Get(int id)
    {
        return DAO.Instance.ReadSingle("SELECT ServicePricesID, ServicesID, Date, DateStart, DateEnd, Price FROM ServicePrices WHERE ServicePricesID = @id", FromReader,
            new List<MySqlParameter> { new MySqlParameter("@id", id) });
    }

    public List<ServicePrices> Get()
    {
        return DAO.Instance.ExecuteReader("SELECT ServicePricesID, ServicesID, Date, DateStart, DateEnd, Price FROM ServicePrices", FromReader);
    }

    public void Put(int id, ServicePrices item)
    {
        var query = @"UPDATE ServicePrices SET ServicesID = @ServicesID, Date = @Date, DateStart = @DateStart, DateEnd = @DateEnd, Price = @Price WHERE ServicePricesID = @id";
        var parameters = new List<MySqlParameter>
        {
            new MySqlParameter("@ServicesID", item.ServicesID),
            new MySqlParameter("@Date", item.Date),
            new MySqlParameter("@DateStart", item.DateStart),
            new MySqlParameter("@DateEnd", (object?)item.DateEnd ?? DBNull.Value),
            new MySqlParameter("@Price", item.Price),
            new MySqlParameter("@id", id)
        };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }

    public void Post(ServicePrices item)
    {
        var query = "INSERT INTO ServicePrices (ServicesID, Date, DateStart, DateEnd, Price) VALUES (@ServicesID, @Date, @DateStart, @DateEnd, @Price)";
        var parameters = new List<MySqlParameter>
        {
            new MySqlParameter("@ServicesID", item.ServicesID),
            new MySqlParameter("@Date", item.Date),
            new MySqlParameter("@DateStart", item.DateStart),
            new MySqlParameter("@DateEnd", (object?)item.DateEnd ?? DBNull.Value),
            new MySqlParameter("@Price", item.Price)
        };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }
}
