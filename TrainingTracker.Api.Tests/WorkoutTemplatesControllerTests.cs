using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TrainingTracker.Api.Controllers;
using TrainingTracker.Api.Data;
using TrainingTracker.Api.Models;

namespace TrainingTracker.Api.Tests;

public class WorkoutTemplatesControllerTests
{
    [Fact]
    public async Task Get_returns_only_templates_owned_by_the_authenticated_user()
    {
        await using var db = CreateContext();
        db.WorkoutTemplates.AddRange(
            new WorkoutTemplate { UserId = "user-a", SportFolderId = 1, Name = "My run" },
            new WorkoutTemplate { UserId = "user-b", SportFolderId = 1, Name = "Other run" });
        await db.SaveChangesAsync();
        var controller = ForUser(db, "user-a");

        var result = await controller.Get(1);

        var ok = Assert.IsType<OkObjectResult>(result);
        var templates = Assert.IsAssignableFrom<IEnumerable<object>>(ok.Value!);
        Assert.Single(templates);
    }

    [Fact]
    public async Task Delete_cannot_remove_another_users_template()
    {
        await using var db = CreateContext();
        var template = new WorkoutTemplate { UserId = "user-b", SportFolderId = 1, Name = "Private" };
        db.WorkoutTemplates.Add(template);
        await db.SaveChangesAsync();
        var controller = ForUser(db, "user-a");

        var result = await controller.Delete(template.Id);

        Assert.IsType<NotFoundResult>(result);
        Assert.NotNull(await db.WorkoutTemplates.FindAsync(template.Id));
    }

    [Fact]
    public async Task Update_rejects_invalid_template_owner()
    {
        await using var db = CreateContext();
        var template = new WorkoutTemplate { UserId = "user-b", SportFolderId = 1, Name = "Private" };
        db.WorkoutTemplates.Add(template);
        await db.SaveChangesAsync();
        var controller = ForUser(db, "user-a");

        var result = await controller.Update(template.Id, new WorkoutTemplatesController.CreateTemplate { Name = "Changed", SportFolderId = 1 });

        Assert.IsType<NotFoundResult>(result);
        Assert.Equal("Private", (await db.WorkoutTemplates.FindAsync(template.Id))!.Name);
    }

    private static AppDbContext CreateContext() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static WorkoutTemplatesController ForUser(AppDbContext db, string userId)
    {
        var controller = new WorkoutTemplatesController(db);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, userId)])) },
        };
        return controller;
    }
}
