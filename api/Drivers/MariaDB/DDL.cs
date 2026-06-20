namespace MyApp.Driver;

public class DDL
{
    public static readonly string[] Definition = {
        @"CREATE DATABASE IF NOT EXISTS myapp DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
        USE myapp;",


        @"CREATE TABLE IF NOT EXISTS TypeAddress (
            TypeAddressID INT AUTO_INCREMENT PRIMARY KEY,
            Name VARCHAR(255) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;",

        @"CREATE TABLE IF NOT EXISTS TypeDescription (
            TypeDescriptionID INT AUTO_INCREMENT PRIMARY KEY,
            Name VARCHAR(255) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;",

        @"CREATE TABLE IF NOT EXISTS Services (
            ServicesID INT AUTO_INCREMENT PRIMARY KEY,
            Name VARCHAR(255) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;",

        @"CREATE TABLE IF NOT EXISTS Publications (
            PublicationsID INT AUTO_INCREMENT PRIMARY KEY,
            Name VARCHAR(255) NOT NULL,
            CoverPath VARCHAR(500) NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;",

        @"CREATE TABLE IF NOT EXISTS Client (
            ClientID INT AUTO_INCREMENT PRIMARY KEY,
            Fio VARCHAR(250) NOT NULL,
            Phone VARCHAR(20) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;",

        @"CREATE TABLE IF NOT EXISTS Catalogs (
            CatalogsID INT AUTO_INCREMENT PRIMARY KEY,
            Name VARCHAR(255) NOT NULL,
            DateStart DATE NOT NULL,
            DateEnd DATE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;",


        @"CREATE TABLE IF NOT EXISTS DeliveryAddress (
            DeliveryAddressID INT AUTO_INCREMENT PRIMARY KEY,
            ParentID INT NOT NULL,
            TypeAddressID INT NOT NULL,
            Name VARCHAR(255) NOT NULL,
            FOREIGN KEY (TypeAddressID) REFERENCES TypeAddress(TypeAddressID)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;",

        @"CREATE TABLE IF NOT EXISTS PublicationsCatalogs (
            PublicationsCatalogsID INT AUTO_INCREMENT PRIMARY KEY,
            PublicationsID INT NOT NULL,
            CatalogsID INT NOT NULL,
            FOREIGN KEY (PublicationsID) REFERENCES Publications(PublicationsID),
            FOREIGN KEY (CatalogsID) REFERENCES Catalogs(CatalogsID)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;",

        @"CREATE TABLE IF NOT EXISTS Description (
            DescriptionID INT AUTO_INCREMENT PRIMARY KEY,
            PublicationsID INT NOT NULL,
            TypeDescriptionID INT NOT NULL,
            Name VARCHAR(255) NOT NULL,
            FOREIGN KEY (PublicationsID) REFERENCES Publications(PublicationsID),
            FOREIGN KEY (TypeDescriptionID) REFERENCES TypeDescription(TypeDescriptionID)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;",

        @"CREATE TABLE IF NOT EXISTS Subscriptions (
            SubscriptionsID INT AUTO_INCREMENT PRIMARY KEY,
            ClientID INT NOT NULL,
            PublicationsID INT NOT NULL,
            Date DATETIME NOT NULL,
            DateStart DATE NOT NULL,
            DateEnd DATE,
            Price DECIMAL(10,2) NOT NULL,
            DeliveryAddressID INT NOT NULL,
            FOREIGN KEY (ClientID) REFERENCES Client(ClientID),
            FOREIGN KEY (PublicationsID) REFERENCES Publications(PublicationsID),
            FOREIGN KEY (DeliveryAddressID) REFERENCES DeliveryAddress(DeliveryAddressID)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;",

        @"CREATE TABLE IF NOT EXISTS SubscriptionServices (
            SubscriptionservicesID INT AUTO_INCREMENT PRIMARY KEY,
            SubscriptionID INT NOT NULL,
            ServicesID INT NOT NULL,
            FOREIGN KEY (SubscriptionID) REFERENCES Subscriptions(SubscriptionsID),
            FOREIGN KEY (ServicesID) REFERENCES Services(ServicesID)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;",

        @"CREATE TABLE IF NOT EXISTS SubscriptionPrices (
            SubscriptionPricesID INT AUTO_INCREMENT PRIMARY KEY,
            PublicationsID INT NOT NULL,
            Price DECIMAL(10,2) NOT NULL,
            Date DATETIME NOT NULL,
            DateStart DATE NOT NULL,
            DateEnd DATE,
            FOREIGN KEY (PublicationsID) REFERENCES Publications(PublicationsID)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;"
    };
}
