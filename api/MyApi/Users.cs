using Microsoft.AspNetCore.Identity;

namespace MyApi.Models;

public class User : IdentityUser 
{
    public string FullName { get; set; } = "";
}