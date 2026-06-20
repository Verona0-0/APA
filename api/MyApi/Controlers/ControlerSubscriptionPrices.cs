using Microsoft.AspNetCore.Mvc;
using MyApi.Singletons;
using MyApp.Common;
using System.Collections.Generic;
using Microsoft.AspNetCore.Authorization;
using OpenIddict.Validation.AspNetCore;
namespace MyApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [Authorize(AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]
    public class SubscriptionPricesController : ControllerBase
    {
        
        // GET: api/SubscriptionPrices
        [HttpGet]
        public List<SubscriptionPrices> Get()
        {
            List<SubscriptionPrices> res = DAO.Instance.SubscriptionPrices.Get();
            return res;
        }

        // GET: api/SubscriptionPrices/{id}
        [HttpGet("{id}")]
        public SubscriptionPrices Get(int id)
        {
            SubscriptionPrices? res = DAO.Instance.SubscriptionPrices.Get(id);
            return res == null ? throw new Exception("Not Found") : res;
        }

        // POST: api/SubscriptionPrices
        [HttpPost]
         public  void Post(SubscriptionPrices item)
        {
            DAO.Instance.SubscriptionPrices.Post(item);
            
        }

        // PUT: api/SubscriptionPrices/{id}
        [HttpPut("{id}")]
        public  void Put(int id, SubscriptionPrices item)
        {
          DAO.Instance.SubscriptionPrices.Put(id,item);  
        }

        // DELETE: api/SubscriptionPrices/{id}
        [HttpDelete("{id}")]
        public void Delete(int id)
        {
            DAO.Instance.SubscriptionPrices.Delete(id);   
        }
    }
}
