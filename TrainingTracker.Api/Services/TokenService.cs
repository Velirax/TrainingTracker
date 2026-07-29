using System.Security.Claims;
using System.Security.Cryptography;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using TrainingTracker.Api.Models;

namespace TrainingTracker.Api.Services;

public class TokenService
{
    // Short-lived access token backed by a long-lived refresh token, rather
    // than one flat 7-day JWT the client could only react to after the fact.
    public static readonly TimeSpan AccessTokenLifetime = TimeSpan.FromMinutes(15);
    public static readonly TimeSpan RefreshTokenLifetime = TimeSpan.FromDays(30);

    private readonly IConfiguration _configuration;

    public TokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public (string Token, DateTime ExpiresAt) CreateAccessToken(AppUser user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
            _configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT key is missing.")));
        var expiresAt = DateTime.UtcNow.Add(AccessTokenLifetime);
        var token = new JwtSecurityToken(
            claims: [new Claim(ClaimTypes.NameIdentifier, user.Id), new Claim(ClaimTypes.Name, user.DisplayName)],
            expires: expiresAt,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }

    public static (string RawToken, string TokenHash, DateTime ExpiresAt) GenerateRefreshToken() =>
        GenerateOpaqueToken(RefreshTokenLifetime);

    // Used for both refresh tokens and password-reset tokens: a random opaque
    // value handed to the client once, with only its hash ever persisted.
    public static (string RawToken, string TokenHash, DateTime ExpiresAt) GenerateOpaqueToken(TimeSpan lifetime)
    {
        var rawToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');

        return (rawToken, HashToken(rawToken), DateTime.UtcNow.Add(lifetime));
    }

    public static string HashToken(string rawToken) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));
}
