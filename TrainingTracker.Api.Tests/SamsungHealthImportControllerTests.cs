using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrainingTracker.Api.Controllers;
using TrainingTracker.Api.Data;
using TrainingTracker.Api.Models;

namespace TrainingTracker.Api.Tests;

public class SamsungHealthImportControllerTests
{
    private const string StepsCsv =
        "header,meta\n" +
        "day_time,step_count\n" +
        "2026-07-20 00:00:00.000,12\n";

    [Fact]
    public async Task ImportSteps_flags_a_drastic_drop_instead_of_overwriting()
    {
        // Regression test for the pedometer_step_count-vs-pedometer_day_summary
        // footgun: uploading the wrong Samsung export (per-interval fragments
        // instead of daily totals) must not silently clobber a good total.
        await using var db = CreateContext();
        db.DailySteps.Add(new DailySteps { UserId = "user-a", Date = new DateOnly(2026, 7, 20), StepCount = 8234 });
        await db.SaveChangesAsync();

        var result = await ForUser(db, "user-a").ImportSteps(CsvFile(StepsCsv), force: false);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        AssertJsonInt(ok.Value!, "added", 0);
        AssertJsonInt(ok.Value!, "updated", 0);
        Assert.Equal(8234, (await db.DailySteps.SingleAsync()).StepCount);
    }

    [Fact]
    public async Task ImportSteps_applies_a_flagged_drop_when_forced()
    {
        await using var db = CreateContext();
        db.DailySteps.Add(new DailySteps { UserId = "user-a", Date = new DateOnly(2026, 7, 20), StepCount = 8234 });
        await db.SaveChangesAsync();

        var result = await ForUser(db, "user-a").ImportSteps(CsvFile(StepsCsv), force: true);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        AssertJsonInt(ok.Value!, "updated", 1);
        Assert.Equal(12, (await db.DailySteps.SingleAsync()).StepCount);
    }

    [Fact]
    public async Task ImportSteps_applies_a_small_non_suspicious_change_without_forcing()
    {
        await using var db = CreateContext();
        db.DailySteps.Add(new DailySteps { UserId = "user-a", Date = new DateOnly(2026, 7, 20), StepCount = 8234 });
        await db.SaveChangesAsync();

        var csv = "header,meta\nday_time,step_count\n2026-07-20 00:00:00.000,8100\n";
        var result = await ForUser(db, "user-a").ImportSteps(CsvFile(csv), force: false);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        AssertJsonInt(ok.Value!, "updated", 1);
        Assert.Equal(8100, (await db.DailySteps.SingleAsync()).StepCount);
    }

    [Fact]
    public async Task ImportSteps_adds_a_new_date_regardless_of_magnitude()
    {
        await using var db = CreateContext();

        var result = await ForUser(db, "user-a").ImportSteps(CsvFile(StepsCsv), force: false);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        AssertJsonInt(ok.Value!, "added", 1);
        Assert.Equal(12, (await db.DailySteps.SingleAsync()).StepCount);
    }

    private static void AssertJsonInt(object value, string propertyName, int expected)
    {
        var property = value.GetType().GetProperty(propertyName);
        Assert.NotNull(property);
        Assert.Equal(expected, (int)property!.GetValue(value)!);
    }

    private static IFormFile CsvFile(string content)
    {
        var bytes = Encoding.UTF8.GetBytes(content);
        return new FormFile(new MemoryStream(bytes), 0, bytes.Length, "file", "steps.csv");
    }

    private static AppDbContext CreateContext() => new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static SamsungHealthImportController ForUser(AppDbContext db, string userId)
    {
        var controller = new SamsungHealthImportController(db);
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, userId)])) } };
        return controller;
    }
}
