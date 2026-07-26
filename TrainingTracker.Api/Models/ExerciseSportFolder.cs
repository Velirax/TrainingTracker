namespace TrainingTracker.Api.Models;

public class ExerciseSportFolder
{
    public int ExerciseId { get; set; }

    public Exercise Exercise { get; set; } = null!;

    public int SportFolderId { get; set; }

    public SportFolder SportFolder { get; set; } = null!;
}
