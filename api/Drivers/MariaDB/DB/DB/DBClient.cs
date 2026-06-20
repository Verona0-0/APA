using System.Collections.Generic;
using MySqlConnector;
using MyApp.Common;
using MyApp.Driver;

namespace MyApp.Driver.DB
{
    class DBClient : IDBClient
    {
        private Client FromReader(MySqlDataReader reader)
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
            DAO.Instance.ExecuteNonQuery(
                "DELETE FROM Client WHERE ClientID = @id",
                new List<MySqlParameter> { new MySqlParameter("@id", id) }
            );
        }

        public Client? Get(int id)
        {
            return DAO.Instance.ReadSingle(
                "SELECT ClientID, Fio, Phone FROM Client WHERE ClientID = @id",
                FromReader,
                new List<MySqlParameter> { new MySqlParameter("@id", id) }
            );
        }

        public List<Client> Get()
        {
            return DAO.Instance.ExecuteReader(
                "SELECT ClientID, Fio, Phone FROM Client",
                FromReader
            );
        }

        public void Put(int id, Client item)
        {
            var query = @"UPDATE Client SET Fio = @Fio, Phone = @Phone WHERE ClientID = @id";
            var parameters = new List<MySqlParameter>
            {
                new MySqlParameter("@Fio",   item.Fio),
                new MySqlParameter("@Phone", item.Phone),
                new MySqlParameter("@id",    id)
            };

            DAO.Instance.ExecuteNonQuery(query, parameters);
        }

        public void Post(Client item)
        {
            var query = "INSERT INTO Client (Fio, Phone) VALUES (@Fio, @Phone)";
            var parameters = new List<MySqlParameter>
            {
                new MySqlParameter("@Fio",   item.Fio),
                new MySqlParameter("@Phone", item.Phone)
            };

            DAO.Instance.ExecuteNonQuery(query, parameters);
        }
    }
}
