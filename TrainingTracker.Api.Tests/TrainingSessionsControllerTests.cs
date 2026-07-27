using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TrainingTracker.Api.Controllers;
using TrainingTracker.Api.Data;
using TrainingTracker.Api.Dtos;
using TrainingTracker.Api.Models;

namespace TrainingTracker.Api.Tests;

public class TrainingSessionsControllerTests
{
    [Fact]
    public async Task Update_returns_not_found_for_a_session_owned_by_another_user()
    {
        await using var db = CreateContext();
        var sport = new SportFolder { UserId = "system", Name = "Running" };
        db.SportFolders.Add(sport);
        var session = new TrainingSession { UserId = "user-b", SportFolder = sport, Title = "Private", SessionDate = DateOnly.FromDateTime(DateTime.Today), StartTime = new TimeOnly(9, 0), EndTime = new TimeOnly(10, 0), DurationMinutes = 60, SessionType = "Workout", Status = "Planned" };
        db.TrainingSessions.Add(session);
        await db.SaveChangesAsync();

        var result = await ForUser(db, "user-a").Update(session.Id, Request(sport.Id, "Completed"));

        Assert.IsType<NotFoundResult>(result.Result);
        Assert.Equal("Planned", (await db.TrainingSessions.FindAsync(session.Id))!.Status);
    }

    [Fact]
    public async Task Update_marks_the_owners_session_completed()
    {
        await using var db = CreateContext();
        var sport = new SportFolder { UserId = "system", Name = "Running", Color = "#176b72" };
        db.SportFolders.Add(sport);
        var session = new TrainingSession { UserId = "user-a", SportFolder = sport, Title = "Morning run", SessionDate = DateOnly.FromDateTime(DateTime.Today), StartTime = new TimeOnly(9, 0), EndTime = new TimeOnly(10, 0), DurationMinutes = 60, SessionType = "Workout", Status = "Planned" };
        db.TrainingSessions.Add(session);
        await db.SaveChangesAsync();

        var result = await ForUser(db, "user-a").Update(session.Id, Request(sport.Id, "Completed"));

        Assert.IsType<OkObjectResult>(result.Result);
        var saved = await db.TrainingSessions.FindAsync(session.Id);
        Assert.Equal("Completed", saved!.Status);
    }

    private static UpdateTrainingSessionDto Request(int sportId, string status) => new()
    {
        SportFolderId = sportId, Title = "Morning run", SessionDate = DateOnly.FromDateTime(DateTime.Today),
        StartTime = new TimeOnly(9, 0), EndTime = new TimeOnly(10, 0), SessionType = "Workout", Status = status,
    };

    private static AppDbContext CreateContext() => new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    private static TrainingSessionsController ForUser(AppDbContext db, string userId)
    {
        var controller = new TrainingSessionsController(db);
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, userId)])) } };
        return controller;
    }
}
