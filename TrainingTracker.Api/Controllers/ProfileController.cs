using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TrainingTracker.Api.Data;

namespace TrainingTracker.Api.Controllers;

[ApiController, Authorize, Route("api/profile")]
public class ProfileController(AppDbContext db) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet("preferences")]
    public async Task<IActionResult> GetPreferences()
    {
        var user = await db.Users.FindAsync(UserId);
        return user is null ? NotFound() : Ok(new { user.DistanceUnit, user.WeekStartsOn, user.DefaultCalendarView });
    }

    [HttpPut("preferences")]
    public async Task<IActionResult> UpdatePreferences([FromBody] PreferencesRequest request)
    {
        if (request.DistanceUnit is not ("km" or "mi") || request.WeekStartsOn is < 0 or > 6 || request.DefaultCalendarView is not ("week" or "month"))
            return BadRequest(new { message = "Invalid preferences." });

        var user = await db.Users.FindAsync(UserId);
        if (user is null) return NotFound();
        user.DistanceUnit = request.DistanceUnit;
        user.WeekStartsOn = request.WeekStartsOn;
        user.DefaultCalendarView = request.DefaultCalendarView;
        await db.SaveChangesAsync();
        return Ok(new { user.DistanceUnit, user.WeekStartsOn, user.DefaultCalendarView });
    }

    public class PreferencesRequest
    {
        public string DistanceUnit { get; set; } = "km";
        public int WeekStartsOn { get; set; } = 1;
        public string DefaultCalendarView { get; set; } = "week";
    }
}
