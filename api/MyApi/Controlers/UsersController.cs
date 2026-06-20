using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using MyApi.Models;
using System.Security.Claims;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly UserManager<User> _userManager;
    private readonly ILogger<UsersController> _logger;

    public UsersController(UserManager<User> userManager, ILogger<UsersController> logger)
    {
        _userManager = userManager;
        _logger = logger;
    }


    //  ПРОСТОЙ ПРОФИЛЬ 
    [HttpGet("profile")]
    [Authorize]
    public IActionResult GetProfile()
    {
        try
        {
            _logger.LogInformation("Profile request from {Claims}",
                User.Claims.Select(c => $"{c.Type}={c.Value}"));

            var username = User.Identity?.Name ?? "Unknown";
            var sub = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var profile = new
            {
                id = sub ?? "",
                username = username,
                fullName = username,
                email = User.FindFirst(ClaimTypes.Email)?.Value ?? "no-email@example.com",
                roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToArray()
            };

            _logger.LogInformation("Profile returned: {@Profile}", profile);
            return Ok(profile);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Profile error");
            return StatusCode(500, new { error = "Внутренняя ошибка" });
        }
    }

    //  Регистрация
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] CreateUserRequest request)
    {
        
        if (await _userManager.FindByEmailAsync(request.Email) != null)
            return BadRequest("Email уже существует");
        if (await _userManager.FindByNameAsync(request.Username) != null)
            return BadRequest("Имя пользователя уже существует");

        
        var user = new User
        {
            UserName = request.Username,
            Email = request.Email,
            FullName = request.FullName,
            EmailConfirmed = true
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(string.Join(", ", result.Errors.Select(e => e.Description)));

        // Роль Client
        await _userManager.AddToRoleAsync(user, "Client");

        _logger.LogInformation(" Новый пользователь: {Username} (ID: {Id})",
            user.UserName, user.Id);

        return Ok(new { message = "Пользователь создан", username = user.UserName });
    }
}

public class CreateUserRequest
{
    public string Username { get; set; } = "";
    public string Email { get; set; } = "";
    public string FullName { get; set; } = "";
    public string Password { get; set; } = "";
    public string Role { get; set; } = "Client";
}
