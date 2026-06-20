using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using Microsoft.Data.Sqlite;
using MyApp.Common;

namespace MyApp.Driver;

class DAO
{
    private static DAO? _Instance;
    private readonly SqliteConnection connection;  
    private readonly Mutex connectionMutex;        

    public static void Initialize(DBСonfig config)
    {
        _Instance = new DAO(config);
    }

    private DAO(DBСonfig config)
    {
        var builder = new SqliteConnectionStringBuilder() {
            DataSource = config.Location
        };
        connection = new SqliteConnection(builder.ConnectionString);
        connectionMutex = new Mutex();
    }

    protected DAO Dao => Instance;
    public static DAO Instance => _Instance ?? throw new Exception("Must be initialize first!");

    private SqliteCommand GetCommand(string query, List<SqliteParameter>? parameters = null)
    {
        var cmd = connection.CreateCommand();
        cmd.CommandText = query;
        if (parameters != null)
        {
            foreach (var p in parameters)
                cmd.Parameters.Add(p);
        }
        return cmd;
    }

    
    public List<T> ExecuteReader<T>(string query, Func<SqliteDataReader, T> mapper, List<SqliteParameter>? parameters = null)
    {
        var result = new List<T>();
        var cmd = GetCommand(query, parameters);

        connectionMutex.WaitOne();
        try
        {
            connection.Open();
            using (var reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                    result.Add(mapper(reader));
            }
        }
        finally
        {
            connection.Close();
            connectionMutex.ReleaseMutex();
        }
        return result;
    }

    public T? ReadSingle<T>(string query, Func<SqliteDataReader, T> mapper, List<SqliteParameter>? parameters = null) where T : class
    {
        var cmd = GetCommand(query, parameters);

        connectionMutex.WaitOne();
        try
        {
            connection.Open();
            using (var reader = cmd.ExecuteReader())
            {
                if (reader.Read())
                    return mapper(reader);
            }
        }
        finally
        {
            connection.Close();
            connectionMutex.ReleaseMutex();
        }
        return null;
    }

    public T? ReadSingle<T>(string query, List<SqliteParameter>? parameters = null) where T : struct
    {
        T? result = null;
        object? dbValue = null;
        var cmd = GetCommand(query, parameters);

        connectionMutex.WaitOne();
        try
        {
            connection.Open();
            dbValue = cmd.ExecuteScalar();
        }
        finally
        {
            connection.Close();
            connectionMutex.ReleaseMutex();
        }

        if (dbValue != null && dbValue != DBNull.Value)
            result = (T)Convert.ChangeType(dbValue, typeof(T));
        return result;
    }

    public void ExecuteNonQuery(string query, List<SqliteParameter>? parameters = null)
    {
        var cmd = GetCommand(query, parameters);
        connectionMutex.WaitOne();
        try
        {
            connection.Open();
            cmd.ExecuteNonQuery();
        }
        finally
        {
            connection.Close();
            connectionMutex.ReleaseMutex();
        }
    }
}
