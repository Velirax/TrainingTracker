namespace TrainingTracker.Api.Models;

public class TrainingSessionExercise
{
    public int Id { get; set; }

    public int TrainingSessionId { get; set; }

    public TrainingSession TrainingSession { get; set; } = null!;

    public int ExerciseId { get; set; }

    public Exercise Exercise { get; set; } = null!;

    // Values are keyed by the exercise's selected tracking fields.
    public string TrackingValuesJson { get; set; } = "{}";
}
