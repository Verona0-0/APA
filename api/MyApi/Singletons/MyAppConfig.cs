using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using MyApp.Common;

namespace MyApi.Singletons
{
    public class MyAppConfig
    {
        private static AppConfig? appConfig = null;
        private static readonly object locker = new();

        private MyAppConfig() { }

        public static AppConfig Instance
        {
            get
            {
                if (appConfig != null) return appConfig;

                lock (locker)
                {
                    if (appConfig != null) return appConfig;

                    string baseDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location) ?? string.Empty;
                    string configDir = Path.Combine(baseDir, "config");
                    string fName = Path.Combine(configDir, "config.json");


                    if (!File.Exists(fName))
                    {
                        throw new FileNotFoundException($"Config file not found: {fName}");
                    }

                    string val = File.ReadAllText(fName);

                    try
                    {
                        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                        appConfig = JsonSerializer.Deserialize<AppConfig>(val, options);
                        if (appConfig == null)
                            throw new FormatException("Config deserialization returned null.");
                    }
                    catch (Exception ex)
                    {
                        throw new FormatException($"Failed to deserialize config: {ex.Message}", ex);
                    }

                    if (appConfig.DBDrivers == null || string.IsNullOrEmpty(appConfig.DBType))
                    {
                        throw new Exception("Configuration missing Drivers or DBType.");
                    }

                    var driver = appConfig.DBDrivers.FirstOrDefault(d => d.Name.Equals(appConfig.DBType, StringComparison.OrdinalIgnoreCase));
                    if (driver == null)
                    {
                        throw new Exception($"Driver for DBType '{appConfig.DBType}' not found in config.");
                    }

                    if (!string.IsNullOrEmpty(driver.LIB))
                    {
                        string resolvedPath = Path.GetFullPath(Path.Combine(baseDir, driver.LIB));
                        if (!File.Exists(resolvedPath))
                        {
                            string projectRoot = Path.GetFullPath(Path.Combine(baseDir, "..", "..", "..", ".."));
                            string driversPath = Path.Combine(projectRoot, "Drivers", driver.Name, "bin", "Debug", "net9.0", $"{driver.Name}.dll");
                            if (File.Exists(driversPath))
                            {
                                resolvedPath = driversPath;
                            }
                            else
                            {
                                throw new FileNotFoundException($"DLL not found at {resolvedPath} or fallback {driversPath}");
                            }
                        }

                        Assembly.LoadFrom(resolvedPath);
                    }

                    return appConfig;
                }
            }
        }
    }
}
