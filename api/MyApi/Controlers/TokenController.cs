using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using MyApi.Models;
using OpenIddict.Abstractions;
using OpenIddict.Server.AspNetCore;
using System.Security.Claims;
using static OpenIddict.Abstractions.OpenIddictConstants;


[ApiController]
[Route("/connect/[action]")]
[ApiExplorerSettings(IgnoreApi = true)]
public class TokenController : ControllerBase
{
    private readonly UserManager<User> _userManager;
    private readonly SignInManager<User> _signInManager;

    public TokenController(UserManager<User> userManager, SignInManager<User> signInManager)
    {
        _userManager = userManager;
        _signInManager = signInManager;
    }

    [HttpPost]
    [IgnoreAntiforgeryToken]
    public async Task<IActionResult> Token()
    {
        var request = HttpContext.GetOpenIddictServerRequest()
            ?? throw new InvalidOperationException("OpenIddict request is null");

        if (request.IsPasswordGrantType())
        {
            var user = await _userManager.FindByNameAsync(request.Username!);
            if (user == null || !await _userManager.CheckPasswordAsync(user, request.Password!))
            {
            
                var properties = new AuthenticationProperties(new Dictionary<string, string?>
                {
                    [OpenIddictServerAspNetCoreConstants.Properties.Error] = Errors.InvalidGrant,
                    [OpenIddictServerAspNetCoreConstants.Properties.ErrorDescription] = "Invalid credentials."
                });
                return Forbid(properties, OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
            }

            var roles = await _userManager.GetRolesAsync(user);

            var claims = new List<Claim>
            {
                new Claim(OpenIddictConstants.Claims.Subject, user.Id),
                new Claim(OpenIddictConstants.Claims.Name, user.UserName!),
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim("fullname", user.FullName),
                new Claim(OpenIddictConstants.Claims.Scope, request.Scope ?? "api1")
            };

            foreach (var role in roles)
            {
                claims.Add(new Claim(ClaimTypes.Role, role));
                claims.Add(new Claim(OpenIddictConstants.Claims.Role, role));
            }

            var principal = new ClaimsPrincipal(new ClaimsIdentity(claims,
                OpenIddictServerAspNetCoreDefaults.AuthenticationScheme));

            foreach (var claim in principal.Claims)
                claim.SetDestinations(OpenIddictConstants.Destinations.AccessToken);

            return SignIn(principal, OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
        }

        return Forbid("Unsupported grant_type");
    }
}