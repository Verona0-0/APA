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
    public class DescriptionController : ControllerBase
    {
        
        // GET: api/Description
        [HttpGet]
        public List<Description> Get()
        {
            List<Description> res = DAO.Instance.Description.Get();
            return res;
        }

        // GET: api/Description/{id}
        [HttpGet("{id}")]
        public Description Get(int id)
        {
            Description? res = DAO.Instance.Description.Get(id);
            return res == null ? throw new Exception("Not Found") : res;
        }

        // POST: api/Description
        [HttpPost]
        public  void Post(Description item)
        {
            DAO.Instance.Description.Post(item);
            
        }

        // PUT: api/Description/{id}
        [HttpPut("{id}")]
        public  void Put(int id, Description item)
        {
            DAO.Instance.Description.Put(id,item);  
        }

        // DELETE: api/Description/{id}
        [HttpDelete("{id}")]
        public void Delete(int id)
        {
            DAO.Instance.Description.Delete(id);   
        }
    }
}
