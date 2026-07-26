using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using TrainingTracker.Api.Data;
using TrainingTracker.Api.Dtos;
using TrainingTracker.Api.Models;

namespace TrainingTracker.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/exercises")]
public class ExercisesController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public ExercisesController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ExerciseDto>>> GetAll(
        [FromQuery] int? sportFolderId)
    {
        await BuiltInExerciseSeeder.SeedAsync(_dbContext);

        var exercises = await _dbContext.Exercises
            .AsNoTracking()
            .Include(exercise => exercise.ExerciseSportFolders)
            .Where(exercise => (exercise.UserId == CurrentUserId || exercise.UserId == "system") && (!sportFolderId.HasValue ||
                exercise.ExerciseSportFolders.Any(link =>
                    link.SportFolderId == sportFolderId.Value)))
            .OrderBy(exercise => exercise.Name)
            .ToListAsync();

        return Ok(exercises.Select(ToDto));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ExerciseDto>> GetById(int id)
    {
        var exercise = await _dbContext.Exercises
            .AsNoTracking()
            .Include(item => item.ExerciseSportFolders)
            .Where(exercise => exercise.Id == id && (exercise.UserId == CurrentUserId || exercise.UserId == "system"))
            .FirstOrDefaultAsync();

        return exercise is null ? NotFound() : Ok(ToDto(exercise));
    }

    [HttpPost]
    public async Task<ActionResult<ExerciseDto>> Create(
        [FromBody] CreateExerciseDto createDto)
    {
        var sportFolderIds = createDto.SportFolderIds.Distinct().ToList();

        if (!ExerciseTrackingFields.TryNormalize(
            createDto.TrackingFields,
            out var trackingFields))
        {
            return BadRequest(new
            {
                message = "One or more tracking fields are not supported."
            });
        }

        if (!await SportFoldersExist(sportFolderIds))
        {
            return BadRequest(new
            {
                message = "One or more selected sport folders do not exist."
            });
        }

        var exercise = new Exercise
        {
            // Temporary until ASP.NET Core Identity is introduced.
            UserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "development-user",
            Name = createDto.Name,
            Description = createDto.Description,
            Category = createDto.Category,
            TrackingFieldsJson = JsonSerializer.Serialize(trackingFields),
            IsBuiltIn = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            ExerciseSportFolders = sportFolderIds
                .Select(sportFolderId => new ExerciseSportFolder
                {
                    SportFolderId = sportFolderId
                })
                .ToList()
        };

        _dbContext.Exercises.Add(exercise);
        await _dbContext.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, ToDto(exercise));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ExerciseDto>> Update(
        int id,
        [FromBody] UpdateExerciseDto updateDto)
    {
        var sportFolderIds = updateDto.SportFolderIds.Distinct().ToList();

        if (!ExerciseTrackingFields.TryNormalize(
            updateDto.TrackingFields,
            out var trackingFields))
        {
            return BadRequest(new
            {
                message = "One or more tracking fields are not supported."
            });
        }

        if (!await SportFoldersExist(sportFolderIds))
        {
            return BadRequest(new
            {
                message = "One or more selected sport folders do not exist."
            });
        }

        var exercise = await _dbContext.Exercises
            .Include(item => item.ExerciseSportFolders)
            .FirstOrDefaultAsync(item => item.Id == id);

        if (exercise is null)
        {
            return NotFound();
        }

        if (exercise.IsBuiltIn)
        {
            return BadRequest(new
            {
                message = "Built-in exercises cannot be changed."
            });
        }

        exercise.Name = updateDto.Name;
        exercise.Description = updateDto.Description;
        exercise.Category = updateDto.Category;
        exercise.TrackingFieldsJson = JsonSerializer.Serialize(trackingFields);
        exercise.UpdatedAt = DateTime.UtcNow;

        _dbContext.ExerciseSportFolders.RemoveRange(exercise.ExerciseSportFolders);
        exercise.ExerciseSportFolders = sportFolderIds
            .Select(sportFolderId => new ExerciseSportFolder
            {
                ExerciseId = exercise.Id,
                SportFolderId = sportFolderId
            })
            .ToList();

        await _dbContext.SaveChangesAsync();

        return Ok(ToDto(exercise));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var exercise = await _dbContext.Exercises.FindAsync(id);

        if (exercise is null)
        {
            return NotFound();
        }

        if (exercise.IsBuiltIn)
        {
            return BadRequest(new
            {
                message = "Built-in exercises cannot be deleted."
            });
        }

        var hasSessionLogs = await _dbContext.TrainingSessionExercises
            .AnyAsync(sessionExercise => sessionExercise.ExerciseId == id);

        if (hasSessionLogs)
        {
            return BadRequest(new
            {
                message = "Exercises that have been used in sessions cannot be deleted."
            });
        }

        _dbContext.Exercises.Remove(exercise);
        await _dbContext.SaveChangesAsync();

        return NoContent();
    }

    private async Task<bool> SportFoldersExist(List<int> sportFolderIds)
    {
        if (sportFolderIds.Count == 0)
        {
            return true;
        }

        var foundCount = await _dbContext.SportFolders
            .CountAsync(folder => sportFolderIds.Contains(folder.Id));

        return foundCount == sportFolderIds.Count;
    }

    private static ExerciseDto ToDto(Exercise exercise)
    {
        return new ExerciseDto
        {
            Id = exercise.Id,
            Name = exercise.Name,
            Description = exercise.Description,
            Category = exercise.Category,
            TrackingFields = DeserializeTrackingFields(exercise.TrackingFieldsJson),
            IsBuiltIn = exercise.IsBuiltIn,
            SportFolderIds = exercise.ExerciseSportFolders
                .Select(link => link.SportFolderId)
                .Order()
                .ToList(),
            CreatedAt = exercise.CreatedAt,
            UpdatedAt = exercise.UpdatedAt
        };
    }

    private static List<string> DeserializeTrackingFields(string trackingFieldsJson)
    {
        if (string.IsNullOrWhiteSpace(trackingFieldsJson))
        {
            return [];
        }

        return JsonSerializer.Deserialize<List<string>>(trackingFieldsJson) ?? [];
    }
}
