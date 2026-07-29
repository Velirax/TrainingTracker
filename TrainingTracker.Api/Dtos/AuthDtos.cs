using System.ComponentModel.DataAnnotations;
namespace TrainingTracker.Api.Dtos;

public class RefreshRequestDto { [Required] public string RefreshToken { get; set; } = string.Empty; }

public class LogoutDto { [Required] public string RefreshToken { get; set; } = string.Empty; }

public class ForgotPasswordDto { [Required, EmailAddress] public string Email { get; set; } = string.Empty; }

public class ResetPasswordDto
{
    [Required, EmailAddress] public string Email { get; set; } = string.Empty;
    [Required] public string Token { get; set; } = string.Empty;
    [Required, StringLength(100, MinimumLength = 8)] public string NewPassword { get; set; } = string.Empty;
}
