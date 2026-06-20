using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using MyApi;
using MyApi.Models;
using OpenIddict.Abstractions;
using OpenIddict.Server.AspNetCore;
using OpenIddict.Validation.AspNetCore;
using static OpenIddict.Abstractions.OpenIddictConstants;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});


builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite("Data Source=auth.db"));


builder.Services.AddIdentity<User, IdentityRole>(options =>
{
    options.Password.RequireDigit = false;
    options.Password.RequiredLength = 4;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = false;
    options.Password.RequireLowercase = false;
    options.SignIn.RequireConfirmedAccount = false;
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders();


builder.Services.AddOpenIddict()
    .AddCore(options => options.UseEntityFrameworkCore().UseDbContext<ApplicationDbContext>())
    .AddServer(options =>
    {
        options
            .AllowPasswordFlow()
            .AllowRefreshTokenFlow()
            .SetTokenEndpointUris("/connect/token")
            .AddDevelopmentEncryptionCertificate()
            .AddDevelopmentSigningCertificate()
            .UseAspNetCore()
            .EnableTokenEndpointPassthrough()
            .DisableTransportSecurityRequirement();
        
    })
    .AddValidation(options =>
    {
        options.UseLocalServer();
        options.UseAspNetCore();
    });


builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme;
})
.AddCookie("Cookies");


builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
    options.AddPolicy("OperatorOrAdmin", policy => policy.RequireRole("Operator", "Admin"));
});


builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "MyApi", Version = "v1" });
    c.AddSecurityDefinition("oauth2", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.OAuth2,
        Flows = new OpenApiOAuthFlows
        {
            Password = new OpenApiOAuthFlow
            {
                TokenUrl = new Uri("http://localhost:5000/connect/token"),
                Scopes = new Dictionary<string, string>
                {
                    ["api1"] = "API Access",
                    ["offline_access"] = "Refresh tokens"
                }
            }
        }
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "oauth2" }
            },
            new[] { "api1" }
        }
    });
});

var app = builder.Build();


using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    var scopeManager = scope.ServiceProvider.GetRequiredService<IOpenIddictScopeManager>();
    var appManager = scope.ServiceProvider.GetRequiredService<IOpenIddictApplicationManager>();

    await context.Database.EnsureDeletedAsync();
    await context.Database.EnsureCreatedAsync();

    string[] roleNames = { "Client", "Operator", "Admin" };
    foreach (var roleName in roleNames)
    {
        if (!await roleManager.RoleExistsAsync(roleName))
        {
            await roleManager.CreateAsync(new IdentityRole(roleName));
            Console.WriteLine($"✅ Роль создана: {roleName}");
        }
    }

    async Task CreateUserWithRole(string username, string email, string fullName, string role)
    {
        if (await userManager.FindByNameAsync(username) == null)
        {
            var user = new User
            {
                Id = Guid.NewGuid().ToString(),
                UserName = username,
                Email = email,
                FullName = fullName,
                EmailConfirmed = true
            };
            await userManager.CreateAsync(user, "pass123");
            await userManager.AddToRoleAsync(user, role);

            
            await userManager.AddClaimAsync(user, new Claim(ClaimTypes.Role, role));

            Console.WriteLine($"✅ {username}/pass123 = {role}");
        }
    }

    await CreateUserWithRole("operator1", "operator1@test.com", "Оператор 1", "Operator");
    await CreateUserWithRole("admin1", "admin1@test.com", "Администратор 1", "Admin");
    await CreateUserWithRole("client1", "client1@test.com", "Иванов И.И.", "Client");

    
    if (await scopeManager.FindByNameAsync("api1") == null)
        await scopeManager.CreateAsync(new OpenIddictScopeDescriptor { Name = "api1" });

    if (await appManager.FindByClientIdAsync("swagger_client") == null)
        await appManager.CreateAsync(new OpenIddictApplicationDescriptor
        {
            ClientId = "swagger_client",
            ClientSecret = "swagger_secret",
            Permissions =
            {
                Permissions.Endpoints.Token,
                Permissions.GrantTypes.Password,
                Permissions.GrantTypes.RefreshToken,
                Permissions.ResponseTypes.Token,
                Permissions.Prefixes.Scope + "api1"
            }
        });
    if (await appManager.FindByClientIdAsync("spa_client") == null)
    {
        await appManager.CreateAsync(new OpenIddictApplicationDescriptor
        {
            ClientId = "spa_client",
            DisplayName = "SPA Client",
            ClientType = ClientTypes.Public,  
            Permissions =
        {
            Permissions.Endpoints.Token,
            Permissions.GrantTypes.Password,
            Permissions.GrantTypes.RefreshToken,
            Permissions.ResponseTypes.Token,
            Permissions.Prefixes.Scope + "api1"
        }
        });
        Console.WriteLine("✅ SPA клиент создан: spa_client");
    }
}

// Ensure covers directory exists for static file serving
var coversDir = Path.Combine(
    app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot"),
    "covers");
Directory.CreateDirectory(coversDir);

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "v1");
        options.OAuthClientId("swagger_client");
        options.OAuthClientSecret("swagger_secret");
        options.OAuthScopes("api1", "offline_access");
        options.OAuthUsePkce();
    });
}

app.UseCors();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

Console.WriteLine("🚀 API: http://localhost:5000/swagger");
app.Run("http://localhost:5000");