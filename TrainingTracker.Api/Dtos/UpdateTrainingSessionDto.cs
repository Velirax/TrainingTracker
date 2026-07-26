using System.ComponentModel.DataAnnotations;

namespace TrainingTracker.Api.Dtos;

public class UpdateTrainingSessionDto
{
    [Range(1, int.MaxValue)]
    public int SportFolderId { get; set; }

    [Required]
    [StringLength(150)]
    public string Title { get; set; } = string.Empty;

    public DateOnly SessionDate { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    [Required]
    [StringLength(50)]
    public string SessionType { get; set; } = string.Empty;

    [Required]
    [StringLength(20)]
    public string Status { get; set; } = string.Empty;

    [Range(1, 5)]
    public int? Rating { get; set; }

    [StringLength(2000)]
    public string? Notes { get; set; }

    public List<CreateTrainingSessionExerciseDto>? Exercises { get; set; }
}
