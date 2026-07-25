using Microsoft.AspNetCore.Mvc;
using TrainingTracker.Api.Data;

namespace TrainingTracker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DatabaseController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public DatabaseController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet("connection")]
    public async Task<IActionResult> CheckConnection()
    {
        var canConnect = await _dbContext.Database.CanConnectAsync();

        return canConnect
            ? Ok(new { message = "Successfully connected to SQL Server." })
            : StatusCode(503, new { message = "Could not connect to SQL Server." });
    }
}