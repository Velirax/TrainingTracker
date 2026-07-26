using System.ComponentModel.DataAnnotations;

namespace TrainingTracker.Api.Dtos;

public class CreateTrainingSessionExerciseDto
{
    [Range(1, int.MaxValue)]
    public int ExerciseId { get; set; }

    public Dictionary<string, string> TrackingValues { get; set; } = [];
}
