using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;
using TrainingTracker.Api.Data;
using TrainingTracker.Api.Models;
namespace TrainingTracker.Api.Controllers;
[ApiController, Authorize, Route("api/workout-templates")]
public class WorkoutTemplatesController(AppDbContext db) : ControllerBase
{
    string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    [HttpGet] public async Task<IActionResult> Get([FromQuery] int sportFolderId) { var items = await db.WorkoutTemplates.Where(x => x.UserId == UserId && x.SportFolderId == sportFolderId).ToListAsync(); return Ok(items.Select(x => new { x.Id, x.Name, x.SportFolderId, Exercises = JsonSerializer.Deserialize<object>(x.ExercisesJson) })); }
    [HttpPost] public async Task<IActionResult> Create([FromBody] CreateTemplate body) { var item = new WorkoutTemplate { UserId = UserId, SportFolderId = body.SportFolderId, Name = body.Name, ExercisesJson = JsonSerializer.Serialize(body.Exercises) }; db.WorkoutTemplates.Add(item); await db.SaveChangesAsync(); return Ok(new { item.Id, item.Name, item.SportFolderId, body.Exercises }); }
    [HttpPut("{id:int}")] public async Task<IActionResult> Update(int id, [FromBody] CreateTemplate body) { var item = await db.WorkoutTemplates.FirstOrDefaultAsync(x => x.Id == id && x.UserId == UserId); if (item is null) return NotFound(); item.Name = body.Name; item.ExercisesJson = JsonSerializer.Serialize(body.Exercises); await db.SaveChangesAsync(); return Ok(new { item.Id, item.Name, item.SportFolderId, body.Exercises }); }
    [HttpDelete("{id:int}")] public async Task<IActionResult> Delete(int id) { var item = await db.WorkoutTemplates.FirstOrDefaultAsync(x => x.Id == id && x.UserId == UserId); if (item is null) return NotFound(); db.Remove(item); await db.SaveChangesAsync(); return NoContent(); }
    public class CreateTemplate { public int SportFolderId { get; set; } public string Name { get; set; } = string.Empty; public object Exercises { get; set; } = new(); }
}
