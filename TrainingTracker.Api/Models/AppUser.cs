namespace TrainingTracker.Api.Models;

public class AppUser
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string DistanceUnit { get; set; } = "km";
    public int WeekStartsOn { get; set; } = 1;
    public string DefaultCalendarView { get; set; } = "week";
    public double? WeightKg { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
