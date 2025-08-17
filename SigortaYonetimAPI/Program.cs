using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using SigortaYonetimAPI.Models;
using SigortaYonetimAPI.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.MaxDepth = 32;
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

// Response caching ekle
builder.Services.AddResponseCaching();

// HttpClient servisi ekle
builder.Services.AddHttpClient();

// CORS ayarları ekle
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy =>
        {
            policy.WithOrigins("http://localhost:3000")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});

// DbContext'i ekle
builder.Services.AddDbContext<SigortaYonetimDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Identity yapılandırması
builder.Services.AddIdentity<ApplicationUser, ApplicationRole>(options =>
{
    // Güçlü şifre politikaları - Chrome uyarısını önlemek için
    options.Password.RequiredLength = 12; // Minimum 12 karakter
    options.Password.RequireDigit = true; // Rakam zorunlu
    options.Password.RequireLowercase = true; // Küçük harf zorunlu
    options.Password.RequireUppercase = true; // Büyük harf zorunlu
    options.Password.RequireNonAlphanumeric = true; // Özel karakter zorunlu
    options.Password.RequiredUniqueChars = 4; // En az 4 farklı karakter
    
    // Kullanıcı politikaları
    options.User.RequireUniqueEmail = true;
    options.User.AllowedUserNameCharacters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._@+";
    
    // Hesap kilitleme politikaları
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(30);
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.AllowedForNewUsers = true;
    
    // E-posta doğrulama (şimdilik kapalı)
    options.SignIn.RequireConfirmedEmail = false;
    options.SignIn.RequireConfirmedAccount = false;
})
.AddEntityFrameworkStores<SigortaYonetimDbContext>()
.AddDefaultTokenProviders();

// JWT Ayarları
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
builder.Services.Configure<JwtSettings>(jwtSettings);

var secretKey = jwtSettings["SecretKey"];
var key = Encoding.UTF8.GetBytes(secretKey!);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidateAudience = true,
        ValidAudience = jwtSettings["Audience"],
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
    
    // JWT debug events
    options.Events = new JwtBearerEvents
    {
        OnAuthenticationFailed = context =>
        {
            Console.WriteLine($"JWT Authentication Failed: {context.Exception.Message}");
            return Task.CompletedTask;
        },
        OnTokenValidated = context =>
        {
            Console.WriteLine($"JWT Token Validated for user: {context.Principal?.Identity?.Name}");
            return Task.CompletedTask;
        },
        OnChallenge = context =>
        {
            Console.WriteLine($"JWT Challenge: {context.Error}, {context.ErrorDescription}");
            return Task.CompletedTask;
        },
        OnMessageReceived = context =>
        {
            Console.WriteLine($"JWT Message Received: {context.Token}");
            return Task.CompletedTask;
        }
    };
});

// Servis kayıtları
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IPricingService, PricingService>();
builder.Services.AddScoped<IPricingCalculationService, PricingCalculationService>();
builder.Services.AddScoped<IPasswordValidationService, PasswordValidationService>();

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// HTTPS redirect'i devre dışı bırak (sadece HTTP kullan)
// app.UseHttpsRedirection();

// CORS middleware'ini ekle
app.UseCors("AllowReactApp");

// Response caching middleware'ini ekle
app.UseResponseCaching();

// Authentication & Authorization middleware
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Veritabanı oluştur (seed data olmadan)
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<SigortaYonetimDbContext>();
    
    try
    {
        // Veritabanı yoksa oluştur
        if (!await context.Database.CanConnectAsync())
        {
            await context.Database.EnsureCreatedAsync();
            Console.WriteLine("Veritabanı oluşturuldu.");
        }
        else
        {
            Console.WriteLine("Veritabanı zaten mevcut.");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Veritabanı hazırlanırken hata: {ex.Message}");
    }
}

app.Run();