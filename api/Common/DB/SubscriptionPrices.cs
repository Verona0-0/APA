namespace MyApp.Common;

public class SubscriptionPrices
{
    public int SubscriptionPricesID { get; set; }
    public int PublicationsID { get; set; }
    public DateTime Date { get; set; }
    public DateTime DateStart { get; set; }
    public DateTime? DateEnd { get; set; }
    public float Price { get; set; }
}