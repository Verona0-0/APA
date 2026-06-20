namespace MyApp.Common;

public class DBDriver
{
    public string Name { get; set; }
    public string LIB { get; set; }
    public DBСonfig? DBConfig { get; set; }



    public DBDriver(string name, string lib)
    {
        Name = name;
        LIB = lib;
    }

    public DBDriver()
    {
        Name = string.Empty;
        LIB = string.Empty;
    }
}