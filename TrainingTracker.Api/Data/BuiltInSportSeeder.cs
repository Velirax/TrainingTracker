using Microsoft.EntityFrameworkCore;
using TrainingTracker.Api.Models;

namespace TrainingTracker.Api.Data;

public static class BuiltInSportSeeder
{
    private sealed record CatalogSport(string Name, string Description, string Color, string Icon);

    private static readonly CatalogSport[] Catalog =
    [
        new("Running", "Outdoor runs and training plans.", "#F7963B", "🏃"),
        new("Cycling", "Road, indoor, and mountain bike training.", "#16A34A", "🚴"),
        new("Swimming", "Pool and open-water swimming.", "#0EA5E9", "🏊"),
        new("Gym", "Strength and resistance training.", "#DC2626", "🏋️"),
        new("Calisthenics", "Bodyweight strength and skill training.", "#7C3AED", "🤸"),
        new("Tennis", "Tennis practice and match sessions.", "#2563EB", "🎾"),
        new("Padel", "Padel practice and match sessions.", "#0891B2", "🏓"),
        new("Football", "Football practice and matches.", "#15803D", "⚽"),
        new("Basketball", "Basketball practice and games.", "#EA580C", "🏀"),
        new("Hiking", "Outdoor hikes and trail activity.", "#65A30D", "🥾"),
        new("Yoga", "Yoga, mobility, and recovery practice.", "#9333EA", "🧘"),
        new("Walking", "Everyday and fitness walking.", "#64748B", "🚶")
    ];

    public static async Task SeedAsync(AppDbContext dbContext)
    {
        var existingNames = await dbContext.SportFolders
            .Select(folder => folder.Name)
            .ToListAsync();

        var missingSports = Catalog
            .Where(sport => !existingNames.Any(existingName =>
                existingName.Equals(sport.Name, StringComparison.OrdinalIgnoreCase)))
            .Select(sport => new SportFolder
            {
                UserId = "system",
                Name = sport.Name,
                Description = sport.Description,
                Color = sport.Color,
                Icon = sport.Icon,
                IsArchived = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            })
            .ToList();

        if (missingSports.Count == 0)
        {
            return;
        }

        await dbContext.SportFolders.AddRangeAsync(missingSports);
        await dbContext.SaveChangesAsync();
    }
}
