namespace TrainingTracker.Api.Dtos;

public class ExerciseDto
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? Category { get; set; }

    public string? DefaultUnit { get; set; }

    public List<string> TrackingFields { get; set; } = [];

    public bool IsBuiltIn { get; set; }

    public List<int> SportFolderIds { get; set; } = [];

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}
