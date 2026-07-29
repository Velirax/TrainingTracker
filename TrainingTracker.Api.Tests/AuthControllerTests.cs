using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using TrainingTracker.Api.Controllers;
using TrainingTracker.Api.Data;
using TrainingTracker.Api.Dtos;
using TrainingTracker.Api.Models;
using TrainingTracker.Api.Services;

namespace TrainingTracker.Api.Tests;

public class AuthControllerTests
{
    [Fact]
    public async Task Login_issues_an_access_token_and_a_persisted_refresh_token()
    {
        await using var db = CreateContext();
        var user = await SeedUser(db, "user@example.com", "correct-password");

        var result = await CreateController(db).Login(new LoginDto { Email = "user@example.com", Password = "correct-password" });

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.False(string.IsNullOrEmpty(GetString(ok.Value!, "token")));
        var refreshToken = GetString(ok.Value!, "refreshToken");
        Assert.False(string.IsNullOrEmpty(refreshToken));

        var storedHash = TokenService.HashToken(refreshToken);
        Assert.True(await db.RefreshTokens.AnyAsync(token =>
            token.UserId == user.Id && token.TokenHash == storedHash && token.RevokedAt == null));
    }

    [Fact]
    public async Task Login_rejects_the_wrong_password()
    {
        await using var db = CreateContext();
        await SeedUser(db, "user@example.com", "correct-password");

        var result = await CreateController(db).Login(new LoginDto { Email = "user@example.com", Password = "wrong-password" });

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }

    [Fact]
    public async Task Refresh_rotates_the_token_and_revokes_the_old_one()
    {
        await using var db = CreateContext();
        await SeedUser(db, "user@example.com", "pw");
        var controller = CreateController(db);
        var loginResult = await controller.Login(new LoginDto { Email = "user@example.com", Password = "pw" });
        var oldRefreshToken = GetString(((OkObjectResult)loginResult.Result!).Value!, "refreshToken");

        var refreshResult = await controller.Refresh(new RefreshRequestDto { RefreshToken = oldRefreshToken });

        var ok = Assert.IsType<OkObjectResult>(refreshResult.Result);
        var newRefreshToken = GetString(ok.Value!, "refreshToken");
        Assert.NotEqual(oldRefreshToken, newRefreshToken);

        var oldStored = await db.RefreshTokens.SingleAsync(token => token.TokenHash == TokenService.HashToken(oldRefreshToken));
        Assert.NotNull(oldStored.RevokedAt);
    }

    [Fact]
    public async Task Refresh_rejects_an_already_revoked_token()
    {
        await using var db = CreateContext();
        await SeedUser(db, "user@example.com", "pw");
        var controller = CreateController(db);
        var loginResult = await controller.Login(new LoginDto { Email = "user@example.com", Password = "pw" });
        var refreshToken = GetString(((OkObjectResult)loginResult.Result!).Value!, "refreshToken");

        await controller.Refresh(new RefreshRequestDto { RefreshToken = refreshToken });
        var secondAttempt = await controller.Refresh(new RefreshRequestDto { RefreshToken = refreshToken });

        Assert.IsType<UnauthorizedObjectResult>(secondAttempt.Result);
    }

    [Fact]
    public async Task Refresh_rejects_an_expired_token()
    {
        await using var db = CreateContext();
        var user = await SeedUser(db, "user@example.com", "pw");
        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = TokenService.HashToken("raw-token"),
            ExpiresAt = DateTime.UtcNow.AddDays(-1)
        });
        await db.SaveChangesAsync();

        var result = await CreateController(db).Refresh(new RefreshRequestDto { RefreshToken = "raw-token" });

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }

    [Fact]
    public async Task Refresh_rejects_an_unknown_token()
    {
        await using var db = CreateContext();

        var result = await CreateController(db).Refresh(new RefreshRequestDto { RefreshToken = "never-issued" });

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }

    [Fact]
    public async Task Logout_revokes_the_token()
    {
        await using var db = CreateContext();
        await SeedUser(db, "user@example.com", "pw");
        var controller = CreateController(db);
        var loginResult = await controller.Login(new LoginDto { Email = "user@example.com", Password = "pw" });
        var refreshToken = GetString(((OkObjectResult)loginResult.Result!).Value!, "refreshToken");

        var logoutResult = await controller.Logout(new LogoutDto { RefreshToken = refreshToken });

        Assert.IsType<NoContentResult>(logoutResult);
        var stored = await db.RefreshTokens.SingleAsync(token => token.TokenHash == TokenService.HashToken(refreshToken));
        Assert.NotNull(stored.RevokedAt);
    }

    [Fact]
    public async Task Logout_is_a_no_op_for_an_unknown_token()
    {
        await using var db = CreateContext();

        var result = await CreateController(db).Logout(new LogoutDto { RefreshToken = "never-issued" });

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task ForgotPassword_responds_identically_for_existing_and_unknown_emails()
    {
        // Guards against using this endpoint to enumerate registered accounts.
        await using var db = CreateContext();
        await SeedUser(db, "user@example.com", "pw");
        var controller = CreateController(db);

        var known = await controller.ForgotPassword(new ForgotPasswordDto { Email = "user@example.com" });
        var unknown = await controller.ForgotPassword(new ForgotPasswordDto { Email = "nobody@example.com" });

        var knownOk = Assert.IsType<OkObjectResult>(known);
        var unknownOk = Assert.IsType<OkObjectResult>(unknown);
        Assert.Equal(GetString(knownOk.Value!, "message"), GetString(unknownOk.Value!, "message"));
    }

    [Fact]
    public async Task ForgotPassword_stores_a_reset_token_hash_for_a_real_user()
    {
        await using var db = CreateContext();
        var user = await SeedUser(db, "user@example.com", "pw");
        var controller = CreateController(db);

        await controller.ForgotPassword(new ForgotPasswordDto { Email = "user@example.com" });

        var stored = await db.Users.FindAsync(user.Id);
        Assert.NotNull(stored!.PasswordResetTokenHash);
        Assert.NotNull(stored.PasswordResetTokenExpiresAt);
    }

    [Fact]
    public async Task ResetPassword_with_the_correct_token_changes_the_password_and_revokes_sessions()
    {
        await using var db = CreateContext();
        var user = await SeedUser(db, "user@example.com", "old-password");
        var controller = CreateController(db);
        var loginResult = await controller.Login(new LoginDto { Email = "user@example.com", Password = "old-password" });
        var activeRefreshToken = GetString(((OkObjectResult)loginResult.Result!).Value!, "refreshToken");

        var (rawToken, tokenHash, expiresAt) = TokenService.GenerateOpaqueToken(TimeSpan.FromHours(1));
        user.PasswordResetTokenHash = tokenHash;
        user.PasswordResetTokenExpiresAt = expiresAt;
        await db.SaveChangesAsync();

        var resetResult = await controller.ResetPassword(new ResetPasswordDto
        {
            Email = "user@example.com",
            Token = rawToken,
            NewPassword = "new-password"
        });

        Assert.IsType<OkObjectResult>(resetResult);
        var updatedUser = await db.Users.FindAsync(user.Id);
        Assert.True(BCrypt.Net.BCrypt.Verify("new-password", updatedUser!.PasswordHash));
        Assert.Null(updatedUser.PasswordResetTokenHash);

        var revokedToken = await db.RefreshTokens.SingleAsync(token => token.TokenHash == TokenService.HashToken(activeRefreshToken));
        Assert.NotNull(revokedToken.RevokedAt);
    }

    [Fact]
    public async Task ResetPassword_rejects_an_incorrect_token()
    {
        await using var db = CreateContext();
        var user = await SeedUser(db, "user@example.com", "old-password");
        var controller = CreateController(db);
        var (_, tokenHash, expiresAt) = TokenService.GenerateOpaqueToken(TimeSpan.FromHours(1));
        user.PasswordResetTokenHash = tokenHash;
        user.PasswordResetTokenExpiresAt = expiresAt;
        await db.SaveChangesAsync();

        var result = await controller.ResetPassword(new ResetPasswordDto
        {
            Email = "user@example.com",
            Token = "wrong-token",
            NewPassword = "new-password"
        });

        Assert.IsType<BadRequestObjectResult>(result);
        var stillUser = await db.Users.FindAsync(user.Id);
        Assert.True(BCrypt.Net.BCrypt.Verify("old-password", stillUser!.PasswordHash));
    }

    [Fact]
    public async Task ResetPassword_rejects_an_expired_token()
    {
        await using var db = CreateContext();
        var user = await SeedUser(db, "user@example.com", "old-password");
        var controller = CreateController(db);
        var (rawToken, tokenHash, _) = TokenService.GenerateOpaqueToken(TimeSpan.FromHours(1));
        user.PasswordResetTokenHash = tokenHash;
        user.PasswordResetTokenExpiresAt = DateTime.UtcNow.AddMinutes(-1);
        await db.SaveChangesAsync();

        var result = await controller.ResetPassword(new ResetPasswordDto
        {
            Email = "user@example.com",
            Token = rawToken,
            NewPassword = "new-password"
        });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    private static async Task<AppUser> SeedUser(AppDbContext db, string email, string password)
    {
        var user = new AppUser { Email = email, DisplayName = "Test User", PasswordHash = BCrypt.Net.BCrypt.HashPassword(password) };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    private static string GetString(object value, string propertyName)
    {
        var property = value.GetType().GetProperty(propertyName);
        Assert.NotNull(property);
        return (string)property!.GetValue(value)!;
    }

    private static AppDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static AuthController CreateController(AppDbContext db)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Jwt:Key"] = "test-only-signing-key-at-least-32-characters-long" })
            .Build();

        return new AuthController(db, new TokenService(configuration), NullLogger<AuthController>.Instance);
    }
}
