namespace MyApp.Common;

public class ServicePrices
{
    public int ServicePricesID { get; set; }
    public int ServicesID { get; set; }
    public DateTime Date { get; set; }
    public DateTime DateStart { get; set; }
    public DateTime? DateEnd { get; set; }
    public float Price { get; set; }
}
