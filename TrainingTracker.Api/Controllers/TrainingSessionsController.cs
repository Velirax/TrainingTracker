using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrainingTracker.Api.Data;
using TrainingTracker.Api.Dtos;
using TrainingTracker.Api.Models;

namespace TrainingTracker.Api.Controllers;

[ApiController]
[Route("api/training-sessions")]
public class TrainingSessionsController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public TrainingSessionsController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpPost]
    public async Task<ActionResult<TrainingSessionDto>> Create(
        [FromBody] CreateTrainingSessionDto createDto)
    {
        if (createDto.EndTime <= createDto.StartTime)
        {
            return BadRequest(new
            {
                message = "End time must be later than start time."
            });
        }

        var sportFolder = await _dbContext.SportFolders
            .FirstOrDefaultAsync(folder => folder.Id == createDto.SportFolderId);

        if (sportFolder is null)
        {
            return BadRequest(new
            {
                message = "The selected sport folder does not exist."
            });
        }

        var duration = createDto.EndTime - createDto.StartTime;

        var trainingSession = new TrainingSession
        {
            // Temporary until ASP.NET Core Identity is introduced.
            UserId = "development-user",
            SportFolderId = sportFolder.Id,
            Title = createDto.Title,
            SessionDate = createDto.SessionDate,
            StartTime = createDto.StartTime,
            EndTime = createDto.EndTime,
            DurationMinutes = (int)duration.TotalMinutes,
            SessionType = createDto.SessionType,
            Status = createDto.Status,
            Rating = createDto.Rating,
            Notes = createDto.Notes,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.TrainingSessions.Add(trainingSession);
        await _dbContext.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, new TrainingSessionDto
        {
            Id = trainingSession.Id,
            SportFolderId = sportFolder.Id,
            SportFolderName = sportFolder.Name,
            SportFolderColor = sportFolder.Color,
            SportFolderIcon = sportFolder.Icon,
            Title = trainingSession.Title,
            SessionDate = trainingSession.SessionDate,
            StartTime = trainingSession.StartTime,
            EndTime = trainingSession.EndTime,
            DurationMinutes = trainingSession.DurationMinutes,
            SessionType = trainingSession.SessionType,
            Status = trainingSession.Status,
            Rating = trainingSession.Rating,
            Notes = trainingSession.Notes,
            CreatedAt = trainingSession.CreatedAt,
            UpdatedAt = trainingSession.UpdatedAt
        });
    }
}