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
    public class TypeAddressController : ControllerBase
    {

        // GET: api/TypeAddress
        [HttpGet]
        public List<TypeAddress> Get()
        {
            List<TypeAddress> res = DAO.Instance.TypeAddress.Get();
            return res;
        }

        // GET: api/TypeAddress/{id}
        [HttpGet("{id}")]
        public TypeAddress Get(int id)
        {
            TypeAddress? res = DAO.Instance.TypeAddress.Get(id);
            return res == null ? throw new Exception("Not Found") : res;
        }

        // POST: api/TypeAddress
        [HttpPost]
        public void Post(TypeAddress item)
        {
            DAO.Instance.TypeAddress.Post(item);

        }

        // PUT: api/TypeAddress/{id}
        [HttpPut("{id}")]
        public void Put(int id, TypeAddress item)
        {
            DAO.Instance.TypeAddress.Put(id, item);
        }

        // DELETE: api/TypeAddress/{id}
        [HttpDelete("{id}")]
        public void Delete(int id)
        {
            DAO.Instance.TypeAddress.Delete(id);
        }
    }
}
