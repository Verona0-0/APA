using System.Reflection;
using MyApi.Singletons;
using MyApp.Common;

public sealed class DAO
{
    private static readonly Lazy<IDatabase> lazyInstance = new(() =>
    {
        var config = MyAppConfig.Instance;
        if (string.IsNullOrEmpty(config.DBType))
            throw new Exception("DBType not specified in config");

        var driver = config.DBDrivers.FirstOrDefault(d =>
            d.Name.Equals(config.DBType, StringComparison.OrdinalIgnoreCase));
        if (driver == null)
            throw new Exception($"Driver for DBType '{config.DBType}' not found");

        string assemblyPath = Path.GetFullPath(Path.Combine(
            Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location) ?? "",
            driver.LIB));

        if (!File.Exists(assemblyPath))
        {
            var projectRoot = Path.GetFullPath(Path.Combine(
                Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location) ?? "",
                "..", "..", "..", ".."));
            assemblyPath = Path.Combine(projectRoot, "Drivers", driver.Name, "bin", "Debug", "net9.0", $"{driver.Name}.dll");
            if (!File.Exists(assemblyPath))
                throw new FileNotFoundException($"DLL not found: {assemblyPath}");
        }

        var asm = Assembly.LoadFrom(assemblyPath);
        var type = asm.GetTypes().FirstOrDefault(t =>
            t.Name.Equals("Database", StringComparison.OrdinalIgnoreCase) &&
            typeof(IDatabase).IsAssignableFrom(t));
        if (type == null)
            throw new Exception("Database class not found");

        
        var dbConfig = new DBСonfig(
            driver.DBConfig?.Location ?? "",
            driver.DBConfig?.Database ?? "",
            driver.DBConfig?.UserName ?? "",
            driver.DBConfig?.Password ?? ""
        );

        return (IDatabase)Activator.CreateInstance(type, dbConfig)!;
    });

    public static IDatabase Instance => lazyInstance.Value;
    private DAO() { }
}
