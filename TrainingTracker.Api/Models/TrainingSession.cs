namespace TrainingTracker.Api.Models;

public class TrainingSession
{
    public int Id { get; set; }

    public string UserId { get; set; } = string.Empty;

    public int SportFolderId { get; set; }

    public SportFolder SportFolder { get; set; } = null!;

    public string Title { get; set; } = string.Empty;

    public DateOnly SessionDate { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    public int DurationMinutes { get; set; }

    public string SessionType { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public int? Rating { get; set; }

    public string? Notes { get; set; }

    public string? RecurrenceGroupId { get; set; }

    // Set when a session is created via CSV import (e.g. Samsung Health) so the
    // recorded calorie figure wins over the app's own MET estimate.
    public int? ImportedCalories { get; set; }

    public ICollection<TrainingSessionExercise> Exercises { get; set; }
        = new List<TrainingSessionExercise>();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
