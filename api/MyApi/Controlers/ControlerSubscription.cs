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
    public class SubscriptionsController : ControllerBase
    {
        
        // GET: api/Subscriptions
        [HttpGet]
        public List<Subscriptions> Get()
        {
            List<Subscriptions> res = DAO.Instance.Subscriptions.Get();
            return res;
        }

        // GET: api/Subscriptions/{id}
        [HttpGet("{id}")]
        public Subscriptions Get(int id)
        {
            Subscriptions? res = DAO.Instance.Subscriptions.Get(id);
            return res == null ? throw new Exception("Not Found") : res;
        }

        // POST: api/Subscriptions
        [HttpPost]
        public  void Post(Subscriptions item)
        {
            DAO.Instance.Subscriptions.Post(item);
            
        }

        // PUT: api/Subscriptions/{id}
        [HttpPut("{id}")]
        public  void Put(int id, Subscriptions item)
        {
          DAO.Instance.Subscriptions.Put(id,item);  
        }

        // DELETE: api/Subscriptions/{id}
        [HttpDelete("{id}")]
        public void Delete(int id)
        {
            DAO.Instance.Subscriptions.Delete(id);   
        }
    }
}
