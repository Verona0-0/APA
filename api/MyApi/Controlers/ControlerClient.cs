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
    public class ClientController : ControllerBase
    {
        
        // GET: api/Client
        [HttpGet]
        public List<Client> Get()
        {
            List<Client> res = DAO.Instance.Client.Get();
            return res;
        }

        // GET: api/Client/{id}
        [HttpGet("{id}")]
        public Client Get(int id)
        {
            Client? res = DAO.Instance.Client.Get(id);
            return res == null ? throw new Exception("Not Found") : res;
        }

        // POST: api/Client
        [HttpPost]
         public  void Post(Client item)
        {
            DAO.Instance.Client.Post(item);
            
        }

        // PUT: api/Client/{id}
        [HttpPut("{id}")]
        public  void Put(int id, Client item)
        {
          DAO.Instance.Client.Put(id,item);  
        }

        // DELETE: api/Client/{id}
        [HttpDelete("{id}")]
        public void Delete(int id)
        {
            DAO.Instance.Client.Delete(id);   
        }
    }
}
