using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;
using MyApp.Common;
using MySqlConnector;

namespace MyApp.Driver
{
    public class DAO
    {
        private static DAO? _Instance;
        private readonly MySqlConnection connection;

        public static void Initialize(DBСonfig config)
        {
            CreateDatabase(config);


            _Instance = new DAO(config);


            foreach (var sql in DDL.Definition)
            {
                try
                {
                    _Instance.ExecuteNonQuery(sql);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"DDL Warning: {ex.Message}");
                }
            }
            Console.WriteLine("✅ DAO + DDL инициализированы!");
        }

        private static void CreateDatabase(DBСonfig config)
        {
            var noDbBuilder = new MySqlConnectionStringBuilder
            {
                Server = config.Location ?? "::1:3306",
                UserID = config.UserName ?? "root",
                Password = config.Password ?? ""

            };

            using var noDbConn = new MySqlConnection(noDbBuilder.ConnectionString);
            noDbConn.Open();

            using var cmd = noDbConn.CreateCommand();
            cmd.CommandText = "CREATE DATABASE IF NOT EXISTS myapp DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci";
            cmd.ExecuteNonQuery();

            Console.WriteLine("✅ База myapp создана!");
        }

        private DAO(DBСonfig config)
        {
            var builder = new MySqlConnectionStringBuilder
            {
                Server = config.Location ?? "::1:3306",
                Database = config.Database ?? "myapp",
                UserID = config.UserName ?? "root",
                Password = config.Password ?? "",
                Pooling = true,
                CharacterSet = "utf8mb4"
            };

            connection = new MySqlConnection(builder.ConnectionString);
        }

        public static DAO Instance
        {
            get
            {
                if (_Instance != null) return _Instance;
                throw new Exception("DAO.Initialize(config) must be called first!");
            }
        }

        private MySqlCommand GetCommand(string query, List<MySqlParameter>? parameters = null)
        {
            var cmd = connection.CreateCommand();
            cmd.CommandText = query;
            if (parameters?.Any() == true)
            {
                foreach (var p in parameters)
                    cmd.Parameters.Add(p);
            }
            return cmd;
        }

        public List<T> ExecuteReader<T>(string query, Func<MySqlDataReader, T> mapper, List<MySqlParameter>? parameters = null)
        {
            var result = new List<T>();
            var cmd = GetCommand(query, parameters);

            try
            {
                connection.Open();
                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    result.Add(mapper(reader));
                }
            }
            finally
            {
                if (connection.State == System.Data.ConnectionState.Open)
                    connection.Close();
            }
            return result;
        }

        public T? ReadSingle<T>(string query, Func<MySqlDataReader, T> mapper, List<MySqlParameter>? parameters = null) where T : class
        {
            var cmd = GetCommand(query, parameters);
            try
            {
                connection.Open();
                using var reader = cmd.ExecuteReader();
                if (reader.Read())
                    return mapper(reader);
            }
            finally
            {
                if (connection.State == System.Data.ConnectionState.Open)
                    connection.Close();
            }
            return null;
        }

        public T? ReadSingle<T>(string query, List<MySqlParameter>? parameters = null) where T : struct
        {
            T? result = null;
            var cmd = GetCommand(query, parameters);
            try
            {
                connection.Open();
                var dbValue = cmd.ExecuteScalar();
                if (dbValue != null && dbValue != DBNull.Value)
                    result = (T)Convert.ChangeType(dbValue, typeof(T));
            }
            finally
            {
                if (connection.State == System.Data.ConnectionState.Open)
                    connection.Close();
            }
            return result;
        }

        public void ExecuteNonQuery(string query, List<MySqlParameter>? parameters = null)
        {
            var cmd = GetCommand(query, parameters);
            try
            {
                connection.Open();
                cmd.ExecuteNonQuery();
            }
            finally
            {
                if (connection.State == System.Data.ConnectionState.Open)
                    connection.Close();
            }
        }
    }
}
