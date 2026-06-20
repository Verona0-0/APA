
namespace MyApp.Common
{
    public interface IDatabase
    {
        IDBDeliveryAddress DeliveryAddress { get; }
        IDBCatalogs Catalogs { get; }
        IDBClient Client { get; }
        IDBDescription Description { get; }
        IDBPublications Publications { get; }
        IDBPublicationsCatalogs PublicationsCatalogs { get; }
        IDBServices Services { get; }
        IDBSubscriptions Subscriptions { get; }
        IDBSubscriptionPrices SubscriptionPrices { get; }
        IDBSubscriptionServices SubscriptionServices { get; }
        IDBTypeAddress TypeAddress { get; }
        IDBTypeDescription TypeDescription{ get;}

    } }