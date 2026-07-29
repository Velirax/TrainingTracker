namespace TrainingTracker.Api.Models;

public class DailySteps
{
    public int Id { get; set; }

    public string UserId { get; set; } = string.Empty;

    public DateOnly Date { get; set; }

    public int StepCount { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
