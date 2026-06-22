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
    public class ServicePricesController : ControllerBase
    {

        // GET: api/ServicePrices
        [HttpGet]
        public List<ServicePrices> Get()
        {
            List<ServicePrices> res = DAO.Instance.ServicePrices.Get();
            return res;
        }

        // GET: api/ServicePrices/{id}
        [HttpGet("{id}")]
        public ServicePrices Get(int id)
        {
            ServicePrices? res = DAO.Instance.ServicePrices.Get(id);
            return res == null ? throw new Exception("Not Found") : res;
        }

        // POST: api/ServicePrices
        [HttpPost]
        public void Post(ServicePrices item)
        {
            DAO.Instance.ServicePrices.Post(item);

        }

        // PUT: api/ServicePrices/{id}
        [HttpPut("{id}")]
        public void Put(int id, ServicePrices item)
        {
            DAO.Instance.ServicePrices.Put(id, item);
        }

        // DELETE: api/ServicePrices/{id}
        [HttpDelete("{id}")]
        public void Delete(int id)
        {
            DAO.Instance.ServicePrices.Delete(id);
        }
    }
}
