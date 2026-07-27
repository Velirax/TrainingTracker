namespace TrainingTracker.Api.Models;
public class WorkoutTemplate { public int Id { get; set; } public string UserId { get; set; } = string.Empty; public int SportFolderId { get; set; } public string Name { get; set; } = string.Empty; public string ExercisesJson { get; set; } = "[]"; public DateTime CreatedAt { get; set; } = DateTime.UtcNow; }
