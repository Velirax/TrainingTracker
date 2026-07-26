namespace TrainingTracker.Api.Models;

public class Exercise
{
    public int Id { get; set; }

    // Temporary until ASP.NET Core Identity is introduced.
    public string UserId { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? Category { get; set; }

    public string TrackingFieldsJson { get; set; } = "[]";

    public bool IsBuiltIn { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ExerciseSportFolder> ExerciseSportFolders { get; set; }
        = new List<ExerciseSportFolder>();

    public ICollection<TrainingSessionExercise> TrainingSessionExercises { get; set; }
        = new List<TrainingSessionExercise>();
}
