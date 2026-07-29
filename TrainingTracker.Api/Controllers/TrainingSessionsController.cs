using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using TrainingTracker.Api.Data;
using TrainingTracker.Api.Dtos;
using TrainingTracker.Api.Models;
using TrainingTracker.Api.Services;

namespace TrainingTracker.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/training-sessions")]
public class TrainingSessionsController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public TrainingSessionsController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }


    [HttpGet]
    public async Task<ActionResult<IEnumerable<TrainingSessionDto>>>
        GetByDateRange(
            [FromQuery] DateOnly startDate,
            [FromQuery] DateOnly endDate)
    {
        if (endDate < startDate)
        {
            return BadRequest(new
            {
                message = "End date must be on or after start date."
            });
        }

        var sessions = await _dbContext.TrainingSessions
            .AsNoTracking()
            .Where(session =>
                session.UserId == CurrentUserId &&
                session.SessionDate >= startDate &&
                session.SessionDate <= endDate)
            .OrderBy(session => session.SessionDate)
            .ThenBy(session => session.StartTime)
            .Select(session => new TrainingSessionDto
            {
                Id = session.Id,
                SportFolderId = session.SportFolderId,
                SportFolderName = session.SportFolder.Name,
                SportFolderColor = session.SportFolder.Color,
                SportFolderIcon = session.SportFolder.Icon,
                Title = session.Title,
                SessionDate = session.SessionDate,
                StartTime = session.StartTime,
                EndTime = session.EndTime,
                DurationMinutes = session.DurationMinutes,
                SessionType = session.SessionType,
                Status = session.Status,
                Rating = session.Rating,
                Notes = session.Notes,
                RecurrenceGroupId = session.RecurrenceGroupId,
                CreatedAt = session.CreatedAt,
                UpdatedAt = session.UpdatedAt
            })
            .ToListAsync();

        await AttachExerciseDetails(sessions);
        await ApplyCalories(sessions);
        return Ok(sessions);
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet("needs-review")]
    public async Task<ActionResult<IEnumerable<TrainingSessionDto>>> GetNeedsReview()
    {
        var today = DateOnly.FromDateTime(DateTime.Today);

        var sessions = await _dbContext.TrainingSessions
            .AsNoTracking()
            .Where(session =>
                session.UserId == CurrentUserId &&
                session.Status == "Planned" &&
                session.SessionDate < today)
            .OrderBy(session => session.SessionDate)
            .ThenBy(session => session.StartTime)
            .Select(session => new TrainingSessionDto
            {
                Id = session.Id,
                SportFolderId = session.SportFolderId,
                SportFolderName = session.SportFolder.Name,
                SportFolderColor = session.SportFolder.Color,
                SportFolderIcon = session.SportFolder.Icon,
                Title = session.Title,
                SessionDate = session.SessionDate,
                StartTime = session.StartTime,
                EndTime = session.EndTime,
                DurationMinutes = session.DurationMinutes,
                SessionType = session.SessionType,
                Status = session.Status,
                Rating = session.Rating,
                Notes = session.Notes,
                RecurrenceGroupId = session.RecurrenceGroupId,
                CreatedAt = session.CreatedAt,
                UpdatedAt = session.UpdatedAt
            })
            .ToListAsync();

        await AttachExerciseDetails(sessions);
        await ApplyCalories(sessions);
        return Ok(sessions);
    }

    [HttpGet("sport-folders/{sportFolderId:int}")]
    public async Task<ActionResult<IEnumerable<TrainingSessionDto>>> GetBySportFolder(
        int sportFolderId)
    {
        var sportFolderExists = await _dbContext.SportFolders
            .AnyAsync(folder => folder.Id == sportFolderId);

        if (!sportFolderExists)
        {
            return NotFound();
        }

        var sessions = await _dbContext.TrainingSessions
            .AsNoTracking()
            .Where(session => session.SportFolderId == sportFolderId && session.UserId == CurrentUserId)
            .OrderByDescending(session => session.SessionDate)
            .ThenByDescending(session => session.StartTime)
            .Select(session => new TrainingSessionDto
            {
                Id = session.Id,
                SportFolderId = session.SportFolderId,
                SportFolderName = session.SportFolder.Name,
                SportFolderColor = session.SportFolder.Color,
                SportFolderIcon = session.SportFolder.Icon,
                Title = session.Title,
                SessionDate = session.SessionDate,
                StartTime = session.StartTime,
                EndTime = session.EndTime,
                DurationMinutes = session.DurationMinutes,
                SessionType = session.SessionType,
                Status = session.Status,
                Rating = session.Rating,
                Notes = session.Notes,
                RecurrenceGroupId = session.RecurrenceGroupId,
                CreatedAt = session.CreatedAt,
                UpdatedAt = session.UpdatedAt
            })
            .ToListAsync();

        await AttachExerciseDetails(sessions);
        await ApplyCalories(sessions);
        return Ok(sessions);
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

        if (createDto.Status == "Planned" &&
            createDto.SessionDate < DateOnly.FromDateTime(DateTime.Today))
        {
            return BadRequest(new
            {
                message = "Planned sessions must be scheduled for today or a future date."
            });
        }

        var sportFolder = await _dbContext.SportFolders
            .FirstOrDefaultAsync(folder => folder.Id == createDto.SportFolderId &&
                (folder.UserId == CurrentUserId || folder.UserId == "system"));

        if (sportFolder is null)
        {
            return BadRequest(new
            {
                message = "The selected sport folder does not exist."
            });
        }

        var exerciseEntryResult = await BuildExerciseEntries(
            sportFolder.Id,
            createDto.Exercises);

        if (exerciseEntryResult.Error is not null)
        {
            return BadRequest(new { message = exerciseEntryResult.Error });
        }

        var duration = createDto.EndTime - createDto.StartTime;

        var trainingSession = new TrainingSession
        {
            // Temporary until ASP.NET Core Identity is introduced.
            UserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "development-user",
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
            RecurrenceGroupId = createDto.RecurrenceGroupId,
            Exercises = exerciseEntryResult.Entries,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.TrainingSessions.Add(trainingSession);
        await _dbContext.SaveChangesAsync();

        var createdDto = new TrainingSessionDto
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
            RecurrenceGroupId = trainingSession.RecurrenceGroupId,
            Exercises = ToExerciseDtos(trainingSession.Exercises),
            CreatedAt = trainingSession.CreatedAt,
            UpdatedAt = trainingSession.UpdatedAt
        };
        await ApplyCalories([createdDto]);

        return StatusCode(StatusCodes.Status201Created, createdDto);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<TrainingSessionDto>> Update(
        int id,
        [FromBody] UpdateTrainingSessionDto updateDto)
    {
        if (updateDto.EndTime <= updateDto.StartTime)
        {
            return BadRequest(new
            {
                message = "End time must be later than start time."
            });
        }

        if (updateDto.Status == "Planned" &&
            updateDto.SessionDate < DateOnly.FromDateTime(DateTime.Today))
        {
            return BadRequest(new
            {
                message = "Planned sessions must be scheduled for today or a future date."
            });
        }

        var trainingSession = await _dbContext.TrainingSessions
            .Include(session => session.SportFolder)
            .Include(session => session.Exercises)
                .ThenInclude(exercise => exercise.Exercise)
            .FirstOrDefaultAsync(session => session.Id == id);

        if (trainingSession is null)
        {
            return NotFound();
        }

        if (trainingSession.UserId != CurrentUserId)
        {
            return NotFound();
        }

        var sportFolder = await _dbContext.SportFolders
            .FirstOrDefaultAsync(folder => folder.Id == updateDto.SportFolderId);

        if (sportFolder is null)
        {
            return BadRequest(new
            {
                message = "The selected sport folder does not exist."
            });
        }

        List<TrainingSessionExercise>? exerciseEntries = null;

        if (updateDto.Exercises is not null)
        {
            var exerciseEntryResult = await BuildExerciseEntries(
                sportFolder.Id,
                updateDto.Exercises);

            if (exerciseEntryResult.Error is not null)
            {
                return BadRequest(new { message = exerciseEntryResult.Error });
            }

            exerciseEntries = exerciseEntryResult.Entries;
        }

        var duration = updateDto.EndTime - updateDto.StartTime;

        trainingSession.SportFolderId = sportFolder.Id;
        trainingSession.Title = updateDto.Title;
        trainingSession.SessionDate = updateDto.SessionDate;
        trainingSession.StartTime = updateDto.StartTime;
        trainingSession.EndTime = updateDto.EndTime;
        trainingSession.DurationMinutes = (int)duration.TotalMinutes;
        trainingSession.SessionType = updateDto.SessionType;
        trainingSession.Status = updateDto.Status;
        trainingSession.Rating = updateDto.Rating;
        trainingSession.Notes = updateDto.Notes;
        trainingSession.RecurrenceGroupId = updateDto.RecurrenceGroupId;
        trainingSession.UpdatedAt = DateTime.UtcNow;

        if (exerciseEntries is not null)
        {
            _dbContext.TrainingSessionExercises.RemoveRange(trainingSession.Exercises);
            trainingSession.Exercises = exerciseEntries;
        }

        await _dbContext.SaveChangesAsync();

        var updatedDto = new TrainingSessionDto
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
            RecurrenceGroupId = trainingSession.RecurrenceGroupId,
            Exercises = ToExerciseDtos(trainingSession.Exercises),
            CreatedAt = trainingSession.CreatedAt,
            UpdatedAt = trainingSession.UpdatedAt
        };
        await ApplyCalories([updatedDto]);

        return Ok(updatedDto);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var trainingSession = await _dbContext.TrainingSessions
            .FirstOrDefaultAsync(session => session.Id == id);

        if (trainingSession is null)
        {
            return NotFound();
        }

        if (trainingSession.UserId != CurrentUserId)
        {
            return NotFound();
        }

        _dbContext.TrainingSessions.Remove(trainingSession);
        await _dbContext.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}/future")]
    public async Task<IActionResult> DeleteFuture(int id)
    {
        var session = await _dbContext.TrainingSessions
            .FirstOrDefaultAsync(item => item.Id == id && item.UserId == CurrentUserId);

        if (session is null)
        {
            return NotFound();
        }

        if (string.IsNullOrWhiteSpace(session.RecurrenceGroupId))
        {
            return BadRequest(new { message = "This session is not part of a recurrence." });
        }

        var futureSessions = await _dbContext.TrainingSessions
            .Where(item => item.UserId == CurrentUserId &&
                item.RecurrenceGroupId == session.RecurrenceGroupId &&
                item.SessionDate >= session.SessionDate)
            .ToListAsync();

        _dbContext.TrainingSessions.RemoveRange(futureSessions);
        await _dbContext.SaveChangesAsync();
        return NoContent();
    }

    private async Task<(List<TrainingSessionExercise> Entries, string? Error)>
        BuildExerciseEntries(
            int sportFolderId,
            List<CreateTrainingSessionExerciseDto> requestedExercises)
    {
        var exerciseIds = requestedExercises
            .Select(item => item.ExerciseId)
            .ToList();

        if (exerciseIds.Count != exerciseIds.Distinct().Count())
        {
            return ([], "An exercise can be added only once to a session.");
        }

        if (exerciseIds.Count == 0)
        {
            return ([], null);
        }

        var exercises = await _dbContext.Exercises
            .Include(exercise => exercise.ExerciseSportFolders)
            .Where(exercise => exerciseIds.Contains(exercise.Id))
            .ToListAsync();

        if (exercises.Count != exerciseIds.Count)
        {
            return ([], "One or more selected exercises do not exist.");
        }

        var exerciseById = exercises.ToDictionary(exercise => exercise.Id);
        var entries = new List<TrainingSessionExercise>();

        foreach (var requestedExercise in requestedExercises)
        {
            var exercise = exerciseById[requestedExercise.ExerciseId];

            if (!exercise.ExerciseSportFolders.Any(link =>
                link.SportFolderId == sportFolderId))
            {
                return ([], "Each selected exercise must belong to the session's sport.");
            }

            var allowedFields = DeserializeTrackingFields(exercise.TrackingFieldsJson);
            var unsupportedField = requestedExercise.TrackingValues.Keys
                .FirstOrDefault(field => !allowedFields.Contains(field));

            if (unsupportedField is not null)
            {
                return ([], $"{unsupportedField} is not enabled for {exercise.Name}.");
            }

            entries.Add(new TrainingSessionExercise
            {
                Exercise = exercise,
                TrackingValuesJson = JsonSerializer.Serialize(
                    requestedExercise.TrackingValues)
            });
        }

        return (entries, null);
    }

    private static List<TrainingSessionExerciseDto> ToExerciseDtos(
        IEnumerable<TrainingSessionExercise> entries)
    {
        return entries.Select(entry => new TrainingSessionExerciseDto
        {
            ExerciseId = entry.ExerciseId == 0 ? entry.Exercise.Id : entry.ExerciseId,
            ExerciseName = entry.Exercise.Name,
            TrackingValues = JsonSerializer.Deserialize<Dictionary<string, string>>(
                entry.TrackingValuesJson) ?? []
        }).ToList();
    }

    private async Task AttachExerciseDetails(List<TrainingSessionDto> sessions)
    {
        if (sessions.Count == 0)
        {
            return;
        }

        var sessionIds = sessions.Select(session => session.Id).ToList();
        var entries = await _dbContext.TrainingSessionExercises
            .AsNoTracking()
            .Include(entry => entry.Exercise)
            .Where(entry => sessionIds.Contains(entry.TrainingSessionId))
            .ToListAsync();

        var entriesBySessionId = entries
            .GroupBy(entry => entry.TrainingSessionId)
            .ToDictionary(
                group => group.Key,
                group => ToExerciseDtos(group));

        foreach (var session in sessions)
        {
            session.Exercises = entriesBySessionId.GetValueOrDefault(session.Id, []);
        }
    }

    private async Task ApplyCalories(List<TrainingSessionDto> sessions)
    {
        if (sessions.Count == 0)
        {
            return;
        }

        var weightKg = await _dbContext.Users
            .Where(user => user.Id == CurrentUserId)
            .Select(user => user.WeightKg)
            .FirstOrDefaultAsync();

        foreach (var session in sessions)
        {
            var manualTotal = session.Exercises
                .Where(exercise => exercise.TrackingValues.ContainsKey("Calories"))
                .Sum(exercise => double.TryParse(exercise.TrackingValues["Calories"], out var value) ? value : 0);

            session.Calories = manualTotal > 0
                ? (int)Math.Round(manualTotal)
                : CalorieCalculationService.EstimateCalories(
                    session.SportFolderName,
                    session.DurationMinutes,
                    weightKg);
        }
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
