using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrainingTracker.Api.Data;
using TrainingTracker.Api.Dtos;
using TrainingTracker.Api.Models;
using TrainingTracker.Api.Services;

namespace TrainingTracker.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/imports/samsung-health")]
public class SamsungHealthImportController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public SamsungHealthImportController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpPost("preview")]
    [RequestSizeLimit(10_000_000)]
    public async Task<ActionResult<List<SamsungHealthImportRowDto>>> Preview([FromForm] IFormFile? file)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "Choose a CSV file exported from Samsung Health." });
        }

        var lines = new List<string>();
        using (var reader = new StreamReader(file.OpenReadStream(), Encoding.UTF8))
        {
            string? line;
            while ((line = await reader.ReadLineAsync()) is not null)
            {
                if (!string.IsNullOrWhiteSpace(line))
                {
                    lines.Add(line);
                }
            }
        }

        var rows = SamsungHealthCsvParser.Parse(lines);

        if (rows.Count == 0)
        {
            return BadRequest(new
            {
                message = "Couldn't find any recognizable exercise rows in this file. Samsung Health's export is a " +
                    "zip with one CSV per data type — make sure you're uploading the \"exercise\" CSV, not steps or sleep."
            });
        }

        var sportFolders = await _dbContext.SportFolders
            .Where(folder => !folder.IsArchived && (folder.UserId == CurrentUserId || folder.UserId == "system"))
            .Select(folder => new { folder.Id, folder.Name })
            .ToListAsync();

        foreach (var row in rows)
        {
            if (row.RawSportLabel is null)
            {
                continue;
            }

            var match = sportFolders.FirstOrDefault(folder =>
                    string.Equals(folder.Name, row.RawSportLabel, StringComparison.OrdinalIgnoreCase)) ??
                sportFolders.FirstOrDefault(folder =>
                    folder.Name.Contains(row.RawSportLabel, StringComparison.OrdinalIgnoreCase) ||
                    row.RawSportLabel.Contains(folder.Name, StringComparison.OrdinalIgnoreCase));

            row.SuggestedSportFolderId = match?.Id;
        }

        return Ok(rows);
    }

    [HttpPost("commit")]
    public async Task<ActionResult<object>> Commit([FromBody] List<SamsungHealthImportCommitRow> rows)
    {
        if (rows is null || rows.Count == 0)
        {
            return BadRequest(new { message = "No rows to import." });
        }

        var sportFolderIds = rows.Select(row => row.SportFolderId).Distinct().ToList();
        var sportFolders = await _dbContext.SportFolders
            .Where(folder => sportFolderIds.Contains(folder.Id) && (folder.UserId == CurrentUserId || folder.UserId == "system"))
            .ToDictionaryAsync(folder => folder.Id);

        if (sportFolders.Count != sportFolderIds.Count)
        {
            return BadRequest(new { message = "One or more selected sports do not exist." });
        }

        var candidateDates = rows.Select(row => row.SessionDate).Distinct().ToList();
        var existingStartTimes = (await _dbContext.TrainingSessions
            .Where(session => session.UserId == CurrentUserId && candidateDates.Contains(session.SessionDate))
            .Select(session => new { session.SessionDate, session.StartTime })
            .ToListAsync())
            .Select(session => (session.SessionDate, session.StartTime))
            .ToHashSet();

        var sessionsToAdd = new List<TrainingSession>();
        var skippedDuplicates = 0;

        foreach (var row in rows)
        {
            if (row.EndTime <= row.StartTime)
            {
                continue;
            }

            if (!existingStartTimes.Add((row.SessionDate, row.StartTime)))
            {
                skippedDuplicates++;
                continue;
            }

            var sportFolder = sportFolders[row.SportFolderId];
            var duration = row.EndTime - row.StartTime;

            sessionsToAdd.Add(new TrainingSession
            {
                UserId = CurrentUserId,
                SportFolderId = sportFolder.Id,
                Title = $"{sportFolder.Name} (Samsung Health import)",
                SessionDate = row.SessionDate,
                StartTime = row.StartTime,
                EndTime = row.EndTime,
                DurationMinutes = (int)duration.TotalMinutes,
                SessionType = "Other",
                Status = "Completed",
                ImportedCalories = row.Calories,
                Notes = "Imported from Samsung Health",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }

        _dbContext.TrainingSessions.AddRange(sessionsToAdd);
        await _dbContext.SaveChangesAsync();

        return Ok(new { imported = sessionsToAdd.Count, skippedDuplicates });
    }

    [HttpPost("steps")]
    [RequestSizeLimit(10_000_000)]
    public async Task<ActionResult<object>> ImportSteps([FromForm] IFormFile? file)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "Choose a CSV file exported from Samsung Health." });
        }

        var lines = new List<string>();
        using (var reader = new StreamReader(file.OpenReadStream(), Encoding.UTF8))
        {
            string? line;
            while ((line = await reader.ReadLineAsync()) is not null)
            {
                if (!string.IsNullOrWhiteSpace(line))
                {
                    lines.Add(line);
                }
            }
        }

        var rows = SamsungHealthStepsCsvParser.Parse(lines);

        if (rows.Count == 0)
        {
            return BadRequest(new
            {
                message = "Couldn't find any recognizable step data in this file. Samsung Health's export is a " +
                    "zip with one CSV per data type — make sure you're uploading the step/pedometer CSV."
            });
        }

        var dates = rows.Select(row => row.Date).ToList();
        var existingByDate = await _dbContext.DailySteps
            .Where(entry => entry.UserId == CurrentUserId && dates.Contains(entry.Date))
            .ToDictionaryAsync(entry => entry.Date);

        var added = 0;
        var updated = 0;

        foreach (var row in rows)
        {
            if (existingByDate.TryGetValue(row.Date, out var existing))
            {
                if (existing.StepCount == row.StepCount)
                {
                    continue;
                }

                existing.StepCount = row.StepCount;
                existing.UpdatedAt = DateTime.UtcNow;
                updated++;
            }
            else
            {
                _dbContext.DailySteps.Add(new DailySteps
                {
                    UserId = CurrentUserId,
                    Date = row.Date,
                    StepCount = row.StepCount,
                    UpdatedAt = DateTime.UtcNow
                });
                added++;
            }
        }

        await _dbContext.SaveChangesAsync();

        return Ok(new
        {
            added,
            updated,
            rangeStart = rows[0].Date,
            rangeEnd = rows[^1].Date
        });
    }
}
