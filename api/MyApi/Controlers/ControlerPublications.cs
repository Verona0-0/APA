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
    public class PublicationsController : ControllerBase
    {
        
        // GET: api/Publications
        [HttpGet]
        public List<Publications> Get()
        {
            List<Publications> res = DAO.Instance.Publications.Get();
            return res;
        }

        // GET: api/Publications/{id}
        [HttpGet("{id}")]
        public Publications Get(int id)
        {
            Publications? res = DAO.Instance.Publications.Get(id);
            return res == null ? throw new Exception("Not Found") : res;
        }

        // POST: api/Publications
        [HttpPost]
         public  void Post(Publications item)
        {
            DAO.Instance.Publications.Post(item);
            
        }

        // PUT: api/Publications/{id}
        [HttpPut("{id}")]
        public  void Put(int id, Publications item)
        {
          DAO.Instance.Publications.Put(id,item);  
        }

        // DELETE: api/Publications/{id}
        [HttpDelete("{id}")]
        public void Delete(int id)
        {
            DAO.Instance.Publications.Delete(id);   
        }
    }
}
