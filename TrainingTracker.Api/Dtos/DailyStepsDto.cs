namespace TrainingTracker.Api.Dtos;

public class DailyStepsDto
{
    public DateOnly Date { get; set; }

    public int StepCount { get; set; }
}
