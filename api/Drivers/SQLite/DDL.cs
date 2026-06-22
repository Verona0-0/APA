namespace MyApp.Driver;


public class DDL
{
    public static readonly string[] Definition = {
        @"CREATE TABLE IF NOT EXISTS DeliveryAddress (
    DeliveryAddressID INTEGER PRIMARY KEY AUTOINCREMENT,
    ParentID INTEGER NOT NULL,
    TypeAddressID TEXT NOT NULL,
    Name TEXT NOT NULL,
    FOREIGN KEY (TypeAddressID) REFERENCES TypeAddress(TypeAddressID)
);


CREATE TABLE IF NOT EXISTS TypeAddress (
    TypeAddressID INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS Client (
    ClientID INTEGER PRIMARY KEY AUTOINCREMENT,
    Fio TEXT NOT NULL,
    Phone TEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS Publications (
    PublicationsID INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL,
    CoverPath TEXT NULL
);


CREATE TABLE IF NOT EXISTS Catalogs (
    CatalogsID INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL,
    DateStart DATE NOT NULL,
    DateEnd DATE
);


CREATE TABLE IF NOT EXISTS PublicationsCatalogs (
    PublicationsCatalogsID INTEGER PRIMARY KEY AUTOINCREMENT,
    PublicationsID INTEGER NOT NULL,
    CatalogsID INTEGER NOT NULL,
    FOREIGN KEY (PublicationsID) REFERENCES Publications(PublicationsID),
    FOREIGN KEY (CatalogsID) REFERENCES Catalogs(CatalogsID)
);


CREATE TABLE IF NOT EXISTS Subscriptions (
    SubscriptionsID INTEGER PRIMARY KEY AUTOINCREMENT,
    ClientID INTEGER NOT NULL,
    PublicationsID INTEGER NOT NULL,
    Date DATETIME NOT NULL,
    DateStart DATE NOT NULL,
    DateEnd DATE,
    Price REAL NOT NULL,
    DeliveryAddressID INTEGER NOT NULL,
    FOREIGN KEY (ClientID) REFERENCES Client(ClientID),
    FOREIGN KEY (PublicationsID) REFERENCES Publications(PublicationsID),
    FOREIGN KEY (DeliveryAddressID) REFERENCES DeliveryAddress(DeliveryAddressID)
);


CREATE TABLE IF NOT EXISTS Description (
    DescriptionID INTEGER PRIMARY KEY AUTOINCREMENT,
    PublicationsID INTEGER NOT NULL,
    TypeDescriptionID INTEGER NOT NULL,
    Name TEXT NOT NULL,
    FOREIGN KEY (PublicationsID) REFERENCES Publications(PublicationsID),
    FOREIGN KEY (TypeDescriptionID) REFERENCES TypeDescription(TypeDescriptionID)
);


CREATE TABLE IF NOT EXISTS TypeDescription (
    TypeDescriptionID INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS SubscriptionServices (
    SubscriptionservicesID INTEGER PRIMARY KEY AUTOINCREMENT,
    SubscriptionID INTEGER NOT NULL,
    ServicesID INTEGER NOT NULL,
    FOREIGN KEY (SubscriptionID) REFERENCES Subscriptions(SubscriptionsID),
    FOREIGN KEY (ServicesID) REFERENCES Services(ServicesID)
);


CREATE TABLE IF NOT EXISTS Services (
    ServicesID INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS SubscriptionPrices (
    SubscriptionPricesID INTEGER PRIMARY KEY AUTOINCREMENT,
    PublicationsID INTEGER NOT NULL,
    Price REAL NOT NULL,
    Date DATETIME NOT NULL,
    DateStart DATE NOT NULL,
    DateEnd DATE,
    FOREIGN KEY (PublicationsID) REFERENCES Publications(PublicationsID)
);


CREATE TABLE IF NOT EXISTS ServicePrices (
    ServicePricesID INTEGER PRIMARY KEY AUTOINCREMENT,
    ServicesID INTEGER NOT NULL,
    Price REAL NOT NULL,
    Date DATETIME NOT NULL,
    DateStart DATE NOT NULL,
    DateEnd DATE,
    FOREIGN KEY (ServicesID) REFERENCES Services(ServicesID)
);"
    };
}



