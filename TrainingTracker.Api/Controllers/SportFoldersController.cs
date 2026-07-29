using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using TrainingTracker.Api.Data;
using TrainingTracker.Api.Dtos;
using TrainingTracker.Api.Models;

namespace TrainingTracker.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/sport-folders")]
public class SportFoldersController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public SportFoldersController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SportFolderDto>>> GetAll()
    {
        await BuiltInSportSeeder.SeedAsync(_dbContext);

        var sportFolders = await _dbContext.SportFolders
            .Where(folder => folder.UserId == CurrentUserId || folder.UserId == "system")
            .OrderBy(folder => folder.Name)
            .Select(folder => new SportFolderDto
            {
                Id = folder.Id,
                Name = folder.Name,
                Description = folder.Description,
                Color = folder.Color,
                Icon = folder.Icon,
                IsArchived = folder.IsArchived,
                SessionCount = folder.TrainingSessions.Count(session => session.UserId == CurrentUserId),
                CreatedAt = folder.CreatedAt,
                UpdatedAt = folder.UpdatedAt
            })
            .ToListAsync();

        return Ok(sportFolders);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<SportFolderDto>> GetById(int id)
    {
        var sportFolder = await _dbContext.SportFolders
            .Where(folder => folder.Id == id && (folder.UserId == CurrentUserId || folder.UserId == "system"))
            .Select(folder => new SportFolderDto
            {
                Id = folder.Id,
                Name = folder.Name,
                Description = folder.Description,
                Color = folder.Color,
                Icon = folder.Icon,
                IsArchived = folder.IsArchived,
                SessionCount = folder.TrainingSessions.Count(session => session.UserId == CurrentUserId),
                CreatedAt = folder.CreatedAt,
                UpdatedAt = folder.UpdatedAt
            })
            .FirstOrDefaultAsync();

        if (sportFolder is null)
        {
            return NotFound();
        }

        return Ok(sportFolder);
    }
    [HttpPut("{id:int}")]
    public async Task<ActionResult<SportFolderDto>> Update(int id, [FromBody] UpdateSportFolderDto updateDto)
    {
        var sportFolder = await _dbContext.SportFolders.FindAsync(id);

        if (sportFolder is null)
        {
            return NotFound();
        }

        if (sportFolder.UserId != CurrentUserId)
        {
            return NotFound();
        }

        sportFolder.Name = updateDto.Name;
        sportFolder.Description = updateDto.Description;
        sportFolder.Color = updateDto.Color;
        sportFolder.Icon = updateDto.Icon;
        sportFolder.IsArchived = updateDto.IsArchived;
        sportFolder.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        return Ok(new SportFolderDto
        {
            Id = sportFolder.Id,
            Name = sportFolder.Name,
            Description = sportFolder.Description,
            Color = sportFolder.Color,
            Icon = sportFolder.Icon,
            IsArchived = sportFolder.IsArchived,
            SessionCount = await _dbContext.TrainingSessions.CountAsync(
                session => session.SportFolderId == sportFolder.Id && session.UserId == CurrentUserId),
            CreatedAt = sportFolder.CreatedAt,
            UpdatedAt = sportFolder.UpdatedAt
        });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var sportFolder = await _dbContext.SportFolders.FindAsync(id);

        if (sportFolder is null)
        {
            return NotFound();
        }

        if (sportFolder.UserId != CurrentUserId)
        {
            return NotFound();
        }

        _dbContext.SportFolders.Remove(sportFolder);
        await _dbContext.SaveChangesAsync();

        return NoContent();
    }
}
