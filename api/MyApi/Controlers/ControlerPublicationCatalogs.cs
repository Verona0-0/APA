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
    public class PublicationsCatalogsController : ControllerBase
    {
        
        // GET: api/PublicationsCatalogs
        [HttpGet]
        public List<PublicationsCatalogs> Get()
        {
            List<PublicationsCatalogs> res = DAO.Instance.PublicationsCatalogs.Get();
            return res;
        }

        // GET: api/PublicationsCatalogs/{id}
        [HttpGet("{id}")]
        public PublicationsCatalogs Get(int id)
        {
            PublicationsCatalogs? res = DAO.Instance.PublicationsCatalogs.Get(id);
            return res == null ? throw new Exception("Not Found") : res;
        }

        // POST: api/PublicationsCatalogs
        [HttpPost]
         public  void Post(PublicationsCatalogs item)
        {
            DAO.Instance.PublicationsCatalogs.Post(item);
            
        }

        // PUT: api/PublicationsCatalogs/{id}
        [HttpPut("{id}")]
        public  void Put(int id, PublicationsCatalogs item)
        {
          DAO.Instance.PublicationsCatalogs.Put(id,item);  
        }

        // DELETE: api/PublicationsCatalogs/{id}
        [HttpDelete("{id}")]
        public void Delete(int id)
        {
            DAO.Instance.PublicationsCatalogs.Delete(id);   
        }
    }
}
