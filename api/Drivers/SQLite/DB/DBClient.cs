

using Microsoft.Data.Sqlite;
using MyApp.Common;


namespace MyApp.Driver.DB;


class DBClient : IDBClient
{
    private Client FromReader(SqliteDataReader reader)
    {
        return new Client
        {
            ClientID = (int)reader.GetInt64(reader.GetOrdinal("ClientID")),
            Fio = reader.GetString(reader.GetOrdinal("Fio")),
            Phone = reader.GetString(reader.GetOrdinal("Phone"))
        };
    }

    public void Delete(int id)
    {
        DAO.Instance.ExecuteNonQuery("DELETE FROM Client WHERE ClientID = @id",
            new List<SqliteParameter> { new SqliteParameter("@id", id) });
    }

    public Client? Get(int id)
    {
        return DAO.Instance.ReadSingle("SELECT  ClientID FROM Client WHERE ClientID = @id", FromReader,
            new List<SqliteParameter> { new SqliteParameter("@id", id) });
    }

    public List<Client> Get()
    {
        return DAO.Instance.ExecuteReader("SELECT  ClientID,Fio,Phone FROM Client", FromReader);
    }

    public void Put(int id, Client item)
    {
        var query = @"UPDATE Client SET Fio = @Fio, Phone = @Phone WHERE ClientID = @id";
        var parameters = new List<SqliteParameter>
            {
                new SqliteParameter("@Fio", item.Fio),
                new SqliteParameter("@Phone", item.Phone),
                new SqliteParameter("@id", id)
            };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }

    public void Post(Client item)
    {
        var query = "INSERT INTO Client (Fio, Phone) VALUES (@Fio, @Phone)";
        var parameters = new List<SqliteParameter>
            {
                new SqliteParameter("@Fio", item.Fio),
                new SqliteParameter("@Phone", item.Phone)
            };
        DAO.Instance.ExecuteNonQuery(query, parameters);
    }
}