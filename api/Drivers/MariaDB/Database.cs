using MyApp.Common;
using MyApp.Driver.DB;



namespace MyApp.Driver;

public class Database : IDatabase
{
    public Database(DBСonfig config)
    {
        DAO.Initialize(config);
    }

    public IDBDeliveryAddress DeliveryAddress => new DBDeliveryAddress();

    public IDBCatalogs Catalogs =>new DBCatalogs();

    public IDBClient Client =>new DBClient();

    public IDBDescription Description =>new DBDescription();

    public IDBPublications Publications =>new DBPublications();

    public IDBPublicationsCatalogs PublicationsCatalogs =>new DBPublicationsCatalogs();

    public IDBServices Services =>new DBServices();

    public IDBServicePrices ServicePrices =>new DBServicePrices();

    public IDBSubscriptions Subscriptions =>new DBSubscriptions();

    public IDBSubscriptionPrices SubscriptionPrices =>new DBSubscriptionPrices();

    public IDBSubscriptionServices SubscriptionServices =>new DBSubscriptionServices();

    public IDBTypeAddress TypeAddress =>new DBTypeAddress();

    public IDBTypeDescription TypeDescription =>new DBTypeDescription();
}
