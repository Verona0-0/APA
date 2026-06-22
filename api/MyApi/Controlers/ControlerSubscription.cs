using Microsoft.AspNetCore.Mvc;
using MyApi.Singletons;
using MyApp.Common;
using System;
using System.Collections.Generic;
using System.Linq;
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
            Validate(item);
            // цену ставим сами на сервере (по действующей цене издания на дату начала),
            // а не берём из запроса — клиент не должен сам назначать сумму
            item.Price = ResolvePrice(item);
            DAO.Instance.Subscriptions.Post(item);

        }

        // цена издания, что действует на дату начала. нет цены — оформить нельзя
        private static float ResolvePrice(Subscriptions item)
        {
            var day = item.DateStart.Date;
            var price = DAO.Instance.SubscriptionPrices.Get()
                .Where(p => p.PublicationsID == item.PublicationsID
                            && p.DateStart.Date <= day
                            && (!p.DateEnd.HasValue || p.DateEnd.Value.Date >= day))
                .OrderByDescending(p => p.DateStart.Date)
                .FirstOrDefault();
            if (price == null)
                throw new ArgumentException("У выбранного издания не задана цена на дату начала подписки");
            return price.Price;
        }

        // если что-то не по правилам — кидаем ArgumentException. он превращается
        // в 400 с текстом для клиента (см. middleware в Program.cs)
        private static void Validate(Subscriptions item)
        {
            // конец должен быть позже начала (по дням)
            if (item.DateEnd.HasValue && item.DateEnd.Value.Date <= item.DateStart.Date)
                throw new ArgumentException("Дата окончания должна быть позже даты начала");

            var today = DateTime.Today;
            // берём не истёкшие подписки этого клиента на это же издание
            var sameProduct = DAO.Instance.Subscriptions.Get()
                .Where(s => s.ClientID == item.ClientID
                            && s.PublicationsID == item.PublicationsID
                            && !(s.DateEnd.HasValue && s.DateEnd.Value.Date < today));

            foreach (var s in sameProduct)
            {
                if (!s.DateEnd.HasValue)
                    throw new ArgumentException("У клиента уже есть бессрочная подписка на это издание");
                // новую можно оформить только с даты окончания предыдущей
                if (item.DateStart.Date < s.DateEnd.Value.Date)
                    throw new ArgumentException(
                        $"Подписка на это издание уже действует до {s.DateEnd.Value:dd.MM.yyyy}. Новую можно оформить не раньше этой даты");
            }
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
