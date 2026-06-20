namespace MyApp.Common;

public class AppConfig
{
    public string DBType { get; }
    public List<DBDriver> DBDrivers { get; set; }


    public AppConfig(string dbType)
    {
        DBType = dbType;
        DBDrivers = new List<DBDriver>();
    }
}