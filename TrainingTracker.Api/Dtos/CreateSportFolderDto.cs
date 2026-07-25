using System.ComponentModel.DataAnnotations;

namespace TrainingTracker.Api.Dtos;

public class CreateSportFolderDto
{
    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Description { get; set; }

    [Required]
    [StringLength(20)]
    public string Color { get; set; } = "#3B82F6";

    [StringLength(50)]
    public string? Icon { get; set; }
}