using System.ComponentModel.DataAnnotations;

namespace TrainingTracker.Api.Dtos;

public class UpdateSportFolderDto
{
    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Description { get; set; }

    [Required]
    [StringLength(20)]
    public string Color { get; set; } = string.Empty;

    [StringLength(50)]
    public string? Icon { get; set; }

    public bool IsArchived { get; set; }
}