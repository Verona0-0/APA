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
    public class ServicesController : ControllerBase
    {
        
        // GET: api/Services
        [HttpGet]
        public List<Services> Get()
        {
            List<Services> res = DAO.Instance.Services.Get();
            return res;
        }

        // GET: api/Services/{id}
        [HttpGet("{id}")]
        public Services Get(int id)
        {
            Services? res = DAO.Instance.Services.Get(id);
            return res == null ? throw new Exception("Not Found") : res;
        }

        // POST: api/Services
        [HttpPost]
         public  void Post(Services item)
        {
            DAO.Instance.Services.Post(item);
            
        }

        // PUT: api/Services/{id}
        [HttpPut("{id}")]
        public  void Put(int id, Services item)
        {
          DAO.Instance.Services.Put(id,item);  
        }

        // DELETE: api/Services/{id}
        [HttpDelete("{id}")]
        public void Delete(int id)
        {
            DAO.Instance.Services.Delete(id);   
        }
    }
}
