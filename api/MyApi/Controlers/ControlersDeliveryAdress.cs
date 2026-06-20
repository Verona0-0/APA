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
    public class DeliveryAddressController : ControllerBase
    {
        
        // GET: api/deliveryAddress
        [HttpGet]
        public List<DeliveryAddress> Get()
        {
            List<DeliveryAddress> res = DAO.Instance.DeliveryAddress.Get();
            return res;
        }

        // GET: api/deliveryAddress/{id}
        [HttpGet("{id}")]
        public DeliveryAddress Get(int id)
        {
            DeliveryAddress? res = DAO.Instance.DeliveryAddress.Get(id);
            return res == null ? throw new Exception("Not Found") : res;
        }

        // POST: api/deliveryAddress
        [HttpPost]
        public  void Post(DeliveryAddress item)
        {
            DAO.Instance.DeliveryAddress.Post(item);
            
        }

        // PUT: api/deliveryAddress/{id}
        [HttpPut("{id}")]
        public  void Put(int id, DeliveryAddress item)
        {
          DAO.Instance.DeliveryAddress.Put(id,item);  
        }

        // DELETE: api/deliveryAddress/{id}
        [HttpDelete("{id}")]
        public void Delete(int id)
        {
            DAO.Instance.DeliveryAddress.Delete(id);   
        }
    }
}
