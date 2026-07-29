using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrainingTracker.Api.Data;
using TrainingTracker.Api.Dtos;

namespace TrainingTracker.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/steps")]
public class StepsController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public StepsController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    public async Task<ActionResult<List<DailyStepsDto>>> GetByDateRange(
        [FromQuery] DateOnly startDate,
        [FromQuery] DateOnly endDate)
    {
        if (endDate < startDate)
        {
            return BadRequest(new { message = "End date must be on or after start date." });
        }

        var entries = await _dbContext.DailySteps
            .AsNoTracking()
            .Where(entry => entry.UserId == CurrentUserId &&
                entry.Date >= startDate &&
                entry.Date <= endDate)
            .OrderBy(entry => entry.Date)
            .Select(entry => new DailyStepsDto
            {
                Date = entry.Date,
                StepCount = entry.StepCount
            })
            .ToListAsync();

        return Ok(entries);
    }
}
