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
    public class SubscriptionServicesController : ControllerBase
    {
        
        // GET: api/SubscriptionServices
        [HttpGet]
        public List<SubscriptionServices> Get()
        {
            List<SubscriptionServices> res = DAO.Instance.SubscriptionServices.Get();
            return res;
        }

        // GET: api/SubscriptionServices/{id}
        [HttpGet("{id}")]
        public SubscriptionServices Get(int id)
        {
            SubscriptionServices? res = DAO.Instance.SubscriptionServices.Get(id);
            return res == null ? throw new Exception("Not Found") : res;
        }

        // POST: api/SubscriptionServices
        [HttpPost]
         public  void Post(SubscriptionServices item)
        {
            DAO.Instance.SubscriptionServices.Post(item);
            
        }

        // PUT: api/SubscriptionServices/{id}
        [HttpPut("{id}")]
        public  void Put(int id, SubscriptionServices item)
        {
          DAO.Instance.SubscriptionServices.Put(id,item);  
        }

        // DELETE: api/SubscriptionServices/{id}
        [HttpDelete("{id}")]
        public void Delete(int id)
        {
            DAO.Instance.SubscriptionServices.Delete(id);   
        }
    }
}
