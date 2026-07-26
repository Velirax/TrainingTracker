namespace TrainingTracker.Api.Dtos;

public class TrainingSessionExerciseDto
{
    public int ExerciseId { get; set; }

    public string ExerciseName { get; set; } = string.Empty;

    public Dictionary<string, string> TrackingValues { get; set; } = [];
}
