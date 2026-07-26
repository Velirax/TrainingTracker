using System.ComponentModel.DataAnnotations;

namespace TrainingTracker.Api.Dtos;

public class CreateExerciseDto
{
    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Description { get; set; }

    [StringLength(100)]
    public string? Category { get; set; }

    public List<string> TrackingFields { get; set; } = [];

    public List<int> SportFolderIds { get; set; } = [];
}
