namespace TrainingTracker.Api.Dtos;

public class SamsungHealthImportRowDto
{
    public int RowIndex { get; set; }

    public DateOnly SessionDate { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    public int DurationMinutes { get; set; }

    public int? Calories { get; set; }

    public string? RawSportLabel { get; set; }

    public int? SuggestedSportFolderId { get; set; }
}

public class SamsungHealthImportCommitRow
{
    public DateOnly SessionDate { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    public int? Calories { get; set; }

    public int SportFolderId { get; set; }
}
