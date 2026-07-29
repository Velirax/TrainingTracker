using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrainingTracker.Api.Data;
using TrainingTracker.Api.Dtos;
using TrainingTracker.Api.Models;
using TrainingTracker.Api.Services;

namespace TrainingTracker.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly TokenService _tokenService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(AppDbContext dbContext, TokenService tokenService, ILogger<AuthController> logger)
    {
        _dbContext = dbContext;
        _tokenService = tokenService;
        _logger = logger;
    }

    [HttpPost("register")]
    public async Task<ActionResult<object>> Register(RegisterDto registerDto)
    {
        var email = registerDto.Email.Trim().ToLowerInvariant();
        if (await _dbContext.Users.AnyAsync(user => user.Email == email))
            return Conflict(new { message = "An account with this email already exists." });

        var user = new AppUser
        {
            Email = email,
            DisplayName = registerDto.DisplayName.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(registerDto.Password)
        };
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();
        return Created("", await CreateSessionResponse(user));
    }

    [HttpPost("login")]
    public async Task<ActionResult<object>> Login(LoginDto loginDto)
    {
        var email = loginDto.Email.Trim().ToLowerInvariant();
        var user = await _dbContext.Users.SingleOrDefaultAsync(item => item.Email == email);
        if (user is null || !BCrypt.Net.BCrypt.Verify(loginDto.Password, user.PasswordHash))
            return Unauthorized(new { message = "Email or password is incorrect." });

        return Ok(await CreateSessionResponse(user));
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<object>> Refresh(RefreshRequestDto request)
    {
        var tokenHash = TokenService.HashToken(request.RefreshToken);
        var storedToken = await _dbContext.RefreshTokens
            .SingleOrDefaultAsync(token => token.TokenHash == tokenHash);

        if (storedToken is null || storedToken.RevokedAt is not null || storedToken.ExpiresAt <= DateTime.UtcNow)
            return Unauthorized(new { message = "Your session has expired. Please sign in again." });

        var user = await _dbContext.Users.FindAsync(storedToken.UserId);
        if (user is null)
            return Unauthorized(new { message = "Your session has expired. Please sign in again." });

        // Rotate: revoke the presented token so it can't be replayed even if intercepted.
        storedToken.RevokedAt = DateTime.UtcNow;
        return Ok(await CreateSessionResponse(user));
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(LogoutDto request)
    {
        var tokenHash = TokenService.HashToken(request.RefreshToken);
        var storedToken = await _dbContext.RefreshTokens
            .SingleOrDefaultAsync(token => token.TokenHash == tokenHash);

        if (storedToken is not null && storedToken.RevokedAt is null)
        {
            storedToken.RevokedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();
        }

        return NoContent();
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordDto request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _dbContext.Users.SingleOrDefaultAsync(item => item.Email == email);

        // Always respond the same way regardless of whether the email exists,
        // so this endpoint can't be used to enumerate registered accounts.
        if (user is not null)
        {
            var (rawToken, tokenHash, expiresAt) = TokenService.GenerateOpaqueToken(TimeSpan.FromHours(1));
            user.PasswordResetTokenHash = tokenHash;
            user.PasswordResetTokenExpiresAt = expiresAt;
            await _dbContext.SaveChangesAsync();

            // No email provider is configured yet - logging the link is the
            // interim delivery mechanism until one is wired in.
            _logger.LogInformation(
                "Password reset requested for {Email}. Reset link: http://localhost:5173/reset-password?email={Email}&token={Token}",
                email, Uri.EscapeDataString(email), rawToken);
        }

        return Ok(new { message = "If an account exists for that email, a reset link has been sent." });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordDto request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _dbContext.Users.SingleOrDefaultAsync(item => item.Email == email);
        var tokenHash = TokenService.HashToken(request.Token);

        if (user is null ||
            user.PasswordResetTokenHash != tokenHash ||
            user.PasswordResetTokenExpiresAt is null ||
            user.PasswordResetTokenExpiresAt <= DateTime.UtcNow)
        {
            return BadRequest(new { message = "This reset link is invalid or has expired." });
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.PasswordResetTokenHash = null;
        user.PasswordResetTokenExpiresAt = null;

        // A password reset should invalidate every existing session, not just
        // the current device's.
        var activeTokens = await _dbContext.RefreshTokens
            .Where(token => token.UserId == user.Id && token.RevokedAt == null)
            .ToListAsync();
        foreach (var token in activeTokens)
        {
            token.RevokedAt = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync();
        return Ok(new { message = "Your password has been reset. Please sign in again." });
    }

    private async Task<object> CreateSessionResponse(AppUser user)
    {
        var (accessToken, accessTokenExpiresAt) = _tokenService.CreateAccessToken(user);
        var (rawRefreshToken, refreshTokenHash, refreshTokenExpiresAt) = TokenService.GenerateRefreshToken();

        _dbContext.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = refreshTokenHash,
            ExpiresAt = refreshTokenExpiresAt
        });
        await _dbContext.SaveChangesAsync();

        return new
        {
            token = accessToken,
            tokenExpiresAt = accessTokenExpiresAt,
            refreshToken = rawRefreshToken,
            user = new { user.Id, user.Email, user.DisplayName }
        };
    }
}
