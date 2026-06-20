using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyApi.Singletons;
using MyApp.Common;
using OpenIddict.Validation.AspNetCore;
using System.Collections.Generic;

namespace MyApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [Authorize(AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]
    public class CatalogsController : ControllerBase
    {
        
        // GET: api/Catalogs
        [HttpGet]
        public List<Catalogs> Get()
        {
            List<Catalogs> res = DAO.Instance.Catalogs.Get();
            return res;
        }

        // GET: api/Catalogs/{id}
        [HttpGet("{id}")]
        public Catalogs Get(int id)
        {
            Catalogs? res = DAO.Instance.Catalogs.Get(id);
            return res == null ? throw new Exception("Not Found") : res;
        }

        // POST: api/Catalogs
        [HttpPost]
        public  void Post(Catalogs item)
        {
            DAO.Instance.Catalogs.Post(item);
            
        }

        // PUT: api/Catalogs/{id}
        [HttpPut("{id}")]
        public  void Put(int id, Catalogs item)
        {
            DAO.Instance.Catalogs.Put(id,item);  
        }

        // DELETE: api/Catalogs/{id}
        [HttpDelete("{id}")]
        public void Delete(int id)
        {
            DAO.Instance.Catalogs.Delete(id);   
        }
    }
}
