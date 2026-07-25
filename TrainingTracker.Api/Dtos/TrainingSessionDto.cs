namespace TrainingTracker.Api.Dtos;

public class TrainingSessionDto
{
    public int Id { get; set; }

    public int SportFolderId { get; set; }

    public string SportFolderName { get; set; } = string.Empty;

    public string SportFolderColor { get; set; } = string.Empty;

    public string? SportFolderIcon { get; set; }

    public string Title { get; set; } = string.Empty;

    public DateOnly SessionDate { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    public int DurationMinutes { get; set; }

    public string SessionType { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public int? Rating { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}