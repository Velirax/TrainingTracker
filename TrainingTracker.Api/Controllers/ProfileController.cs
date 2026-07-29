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
        return user is null ? NotFound() : Ok(new
        {
            user.DistanceUnit,
            user.WeekStartsOn,
            user.DefaultCalendarView,
            user.WeightKg,
            user.WeeklyTrainingMinutesGoal,
            user.DailyStepsGoal,
            user.StreakGoalDays,
            user.LastStepsImportAt
        });
    }

    [HttpPut("preferences")]
    public async Task<IActionResult> UpdatePreferences([FromBody] PreferencesRequest request)
    {
        if (request.DistanceUnit is not ("km" or "mi") || request.WeekStartsOn is < 0 or > 6 || request.DefaultCalendarView is not ("week" or "month"))
            return BadRequest(new { message = "Invalid preferences." });

        if (request.WeightKg is not null && request.WeightKg is < 20 or > 300)
            return BadRequest(new { message = "Weight must be between 20 and 300 kg." });

        if (request.WeeklyTrainingMinutesGoal is not null && request.WeeklyTrainingMinutesGoal <= 0)
            return BadRequest(new { message = "Weekly training goal must be greater than zero." });

        if (request.DailyStepsGoal is not null && request.DailyStepsGoal <= 0)
            return BadRequest(new { message = "Daily steps goal must be greater than zero." });

        if (request.StreakGoalDays is not null && request.StreakGoalDays <= 0)
            return BadRequest(new { message = "Streak goal must be greater than zero." });

        var user = await db.Users.FindAsync(UserId);
        if (user is null) return NotFound();
        user.DistanceUnit = request.DistanceUnit;
        user.WeekStartsOn = request.WeekStartsOn;
        user.DefaultCalendarView = request.DefaultCalendarView;
        user.WeightKg = request.WeightKg;
        user.WeeklyTrainingMinutesGoal = request.WeeklyTrainingMinutesGoal;
        user.DailyStepsGoal = request.DailyStepsGoal;
        user.StreakGoalDays = request.StreakGoalDays;
        await db.SaveChangesAsync();
        return Ok(new
        {
            user.DistanceUnit,
            user.WeekStartsOn,
            user.DefaultCalendarView,
            user.WeightKg,
            user.WeeklyTrainingMinutesGoal,
            user.DailyStepsGoal,
            user.StreakGoalDays,
            user.LastStepsImportAt
        });
    }

    public class PreferencesRequest
    {
        public string DistanceUnit { get; set; } = "km";
        public int WeekStartsOn { get; set; } = 1;
        public string DefaultCalendarView { get; set; } = "week";
        public double? WeightKg { get; set; }
        public int? WeeklyTrainingMinutesGoal { get; set; }
        public int? DailyStepsGoal { get; set; }
        public int? StreakGoalDays { get; set; }
    }
}
