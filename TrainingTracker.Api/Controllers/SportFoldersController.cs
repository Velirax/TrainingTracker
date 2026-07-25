using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrainingTracker.Api.Data;
using TrainingTracker.Api.Dtos;
using TrainingTracker.Api.Models;

namespace TrainingTracker.Api.Controllers;

[ApiController]
[Route("api/sport-folders")]
public class SportFoldersController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public SportFoldersController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SportFolderDto>>> GetAll()
    {
        var sportFolders = await _dbContext.SportFolders
            .OrderBy(folder => folder.Name)
            .Select(folder => new SportFolderDto
            {
                Id = folder.Id,
                Name = folder.Name,
                Description = folder.Description,
                Color = folder.Color,
                Icon = folder.Icon,
                IsArchived = folder.IsArchived,
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
            .Where(folder => folder.Id == id)
            .Select(folder => new SportFolderDto
            {
                Id = folder.Id,
                Name = folder.Name,
                Description = folder.Description,
                Color = folder.Color,
                Icon = folder.Icon,
                IsArchived = folder.IsArchived,
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
    [HttpPost]
    public async Task<ActionResult<SportFolderDto>> Create([FromBody] CreateSportFolderDto createDto)
    {
        var sportFolder = new SportFolder
        {
            // Temporary until ASP.NET Core Identity is introduced.
            UserId = "development-user",
            Name = createDto.Name,
            Description = createDto.Description,
            Color = createDto.Color,
            Icon = createDto.Icon,
            IsArchived = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.SportFolders.Add(sportFolder);
        await _dbContext.SaveChangesAsync();

        var response = new SportFolderDto
        {
            Id = sportFolder.Id,
            Name = sportFolder.Name,
            Description = sportFolder.Description,
            Color = sportFolder.Color,
            Icon = sportFolder.Icon,
            IsArchived = sportFolder.IsArchived,
            CreatedAt = sportFolder.CreatedAt,
            UpdatedAt = sportFolder.UpdatedAt
        };

        return StatusCode(StatusCodes.Status201Created, response);
    }
}