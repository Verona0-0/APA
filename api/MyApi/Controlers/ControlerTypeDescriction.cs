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
    public class TypeDescriptionController : ControllerBase
    {
        
        // GET: api/TypeDescription
        [HttpGet]
        public List<TypeDescription> Get()
        {
            List<TypeDescription> res = DAO.Instance.TypeDescription.Get();
            return res;
        }

        // GET: api/TypeDescription/{id}
        [HttpGet("{id}")]
        public TypeDescription Get(int id)
        {
            TypeDescription? res = DAO.Instance.TypeDescription.Get(id);
            return res == null ? throw new Exception("Not Found") : res;
        }

        // POST: api/TypeDescription
        [HttpPost]
         public  void Post(TypeDescription item)
        {
            DAO.Instance.TypeDescription.Post(item);
            
        }

        // PUT: api/TypeDescription/{id}
        [HttpPut("{id}")]
        public  void Put(int id, TypeDescription item)
        {
          DAO.Instance.TypeDescription.Put(id,item);  
        }

        // DELETE: api/TypeDescription/{id}
        [HttpDelete("{id}")]
        public void Delete(int id)
        {
            DAO.Instance.TypeDescription.Delete(id);   
        }
    }
}
