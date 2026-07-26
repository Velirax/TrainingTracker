using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using TrainingTracker.Api.Models;

namespace TrainingTracker.Api.Data;

public static class BuiltInExerciseSeeder
{
    private sealed record CatalogExercise(
        string Sport,
        string Name,
        string Category,
        string DefaultUnit,
        string Description);

    private static readonly CatalogExercise[] Catalog =
    [
        new("Running", "Easy run", "Running", "kilometres", "Comfortable aerobic running."),
        new("Running", "Long run", "Running", "kilometres", "Long, steady endurance run."),
        new("Running", "Interval run", "Running", "repetitions", "Repeated fast efforts with recovery."),
        new("Running", "Tempo run", "Running", "minutes", "Sustained comfortably hard running."),
        new("Running", "Hill repeats", "Running", "repetitions", "Uphill running efforts with recovery."),
        new("Running", "Strides", "Running", "repetitions", "Short relaxed accelerations."),

        new("Cycling", "Endurance ride", "Cycling", "kilometres", "Steady aerobic cycling."),
        new("Cycling", "Interval ride", "Cycling", "repetitions", "Structured high-intensity intervals."),
        new("Cycling", "Cadence drills", "Cycling", "minutes", "Pedalling technique and cadence work."),
        new("Cycling", "Hill repeats", "Cycling", "repetitions", "Repeated climbs with recovery."),
        new("Cycling", "Recovery ride", "Cycling", "minutes", "Easy cycling for recovery."),

        new("Swimming", "Freestyle intervals", "Swimming", "lengths", "Repeated freestyle efforts with rest."),
        new("Swimming", "Technique drills", "Swimming", "lengths", "Focused swimming technique practice."),
        new("Swimming", "Endurance swim", "Swimming", "metres", "Continuous aerobic swimming."),
        new("Swimming", "Kick set", "Swimming", "lengths", "Leg-focused swimming with a kickboard."),
        new("Swimming", "Pull buoy set", "Swimming", "lengths", "Upper-body focused swimming set."),

        new("Gym", "Barbell squat", "Strength", "sets", "Lower-body compound strength movement."),
        new("Gym", "Deadlift", "Strength", "sets", "Hip-hinge compound strength movement."),
        new("Gym", "Bench press", "Strength", "sets", "Horizontal pushing strength movement."),
        new("Gym", "Overhead press", "Strength", "sets", "Vertical pressing strength movement."),
        new("Gym", "Pull-up", "Strength", "repetitions", "Vertical pulling bodyweight movement."),
        new("Gym", "Barbell row", "Strength", "sets", "Horizontal pulling strength movement."),
        new("Gym", "Plank", "Core", "seconds", "Static trunk stability exercise."),

        new("Calisthenics", "Push-up", "Strength", "repetitions", "Bodyweight horizontal pushing exercise."),
        new("Calisthenics", "Pull-up", "Strength", "repetitions", "Bodyweight vertical pulling exercise."),
        new("Calisthenics", "Dip", "Strength", "repetitions", "Bodyweight pressing exercise."),
        new("Calisthenics", "Bodyweight squat", "Strength", "repetitions", "Bodyweight lower-body exercise."),
        new("Calisthenics", "Hanging leg raise", "Core", "repetitions", "Hanging core-strength exercise."),
        new("Calisthenics", "Handstand practice", "Skill", "minutes", "Balance and inverted-position practice."),

        new("Tennis", "Forehand drill", "Technical", "repetitions", "Forehand technique and consistency practice."),
        new("Tennis", "Backhand drill", "Technical", "repetitions", "Backhand technique and consistency practice."),
        new("Tennis", "Serve practice", "Technical", "serves", "Focused first and second serve practice."),
        new("Tennis", "Return drill", "Technical", "repetitions", "Practice returning serves."),
        new("Tennis", "Volley drill", "Technical", "repetitions", "Net-play and volley practice."),
        new("Tennis", "Footwork drills", "Movement", "minutes", "Court movement and split-step practice."),
        new("Tennis", "Match play", "Match", "minutes", "Competitive or practice match play."),

        new("Padel", "Forehand drive", "Technical", "repetitions", "Forehand drive technique practice."),
        new("Padel", "Backhand drive", "Technical", "repetitions", "Backhand drive technique practice."),
        new("Padel", "Bandeja", "Technical", "repetitions", "Bandeja overhead-shot practice."),
        new("Padel", "Vibora", "Technical", "repetitions", "Vibora overhead-shot practice."),
        new("Padel", "Wall drills", "Technical", "repetitions", "Using the glass walls effectively."),
        new("Padel", "Volley drills", "Technical", "repetitions", "Net volley practice."),
        new("Padel", "Match play", "Match", "minutes", "Competitive or practice match play."),

        new("Football", "Passing drills", "Technical", "repetitions", "Short and long passing practice."),
        new("Football", "Shooting drills", "Technical", "shots", "Finishing and shooting practice."),
        new("Football", "First-touch drills", "Technical", "repetitions", "Ball-control practice."),
        new("Football", "Dribbling drills", "Technical", "minutes", "Close-control and change-of-direction practice."),
        new("Football", "Sprint conditioning", "Conditioning", "repetitions", "Short sprint efforts with recovery."),
        new("Football", "Small-sided game", "Match", "minutes", "High-touch small-team game."),

        new("Basketball", "Shooting drills", "Technical", "shots", "Form shooting and spot-up practice."),
        new("Basketball", "Ball handling", "Technical", "minutes", "Dribbling and control practice."),
        new("Basketball", "Layup drill", "Technical", "repetitions", "Layup finishing practice."),
        new("Basketball", "Defensive slides", "Movement", "minutes", "Lateral defensive movement practice."),
        new("Basketball", "Rebounding drills", "Technical", "repetitions", "Positioning and rebounding practice."),
        new("Basketball", "Scrimmage", "Match", "minutes", "Practice game play."),

        new("Hiking", "Steady hike", "Endurance", "kilometres", "Moderate-paced outdoor hike."),
        new("Hiking", "Hill climb", "Endurance", "metres", "Uphill hiking effort."),
        new("Hiking", "Pack carry", "Strength", "minutes", "Hiking while carrying a loaded pack."),
        new("Hiking", "Navigation practice", "Skill", "minutes", "Map, compass, or route-planning practice."),

        new("Yoga", "Sun salutations", "Flow", "repetitions", "Dynamic warm-up yoga sequence."),
        new("Yoga", "Vinyasa flow", "Flow", "minutes", "Continuous breath-led yoga practice."),
        new("Yoga", "Balance practice", "Balance", "minutes", "Standing balance poses."),
        new("Yoga", "Mobility flow", "Mobility", "minutes", "Mobility-focused yoga sequence."),
        new("Yoga", "Breathwork", "Recovery", "minutes", "Controlled breathing practice."),

        new("Walking", "Brisk walk", "Walking", "kilometres", "Purposeful moderate-paced walk."),
        new("Walking", "Incline walk", "Walking", "minutes", "Walking with an incline or hills."),
        new("Walking", "Long walk", "Walking", "kilometres", "Extended low-intensity walk."),
        new("Walking", "Recovery walk", "Recovery", "minutes", "Easy walk for active recovery.")
    ];

    public static async Task SeedAsync(AppDbContext dbContext)
    {
        var folders = await dbContext.SportFolders.ToListAsync();

        if (folders.Count == 0)
        {
            return;
        }

        var exercises = await dbContext.Exercises
            .Include(exercise => exercise.ExerciseSportFolders)
            .ToListAsync();

        var hasChanges = false;

        foreach (var folder in folders)
        {
            var matchingItems = Catalog.Where(item =>
                folder.Name.Contains(item.Sport, StringComparison.OrdinalIgnoreCase));

            foreach (var item in matchingItems)
            {
                var existingExerciseForFolder = exercises.FirstOrDefault(exercise =>
                    exercise.Name.Equals(item.Name, StringComparison.OrdinalIgnoreCase) &&
                    exercise.ExerciseSportFolders.Any(link =>
                        link.SportFolderId == folder.Id));

                if (existingExerciseForFolder is not null)
                {
                    ApplyDefaultTrackingFields(existingExerciseForFolder, item, ref hasChanges);
                    continue;
                }

                var exercise = exercises.FirstOrDefault(existing =>
                    existing.IsBuiltIn &&
                    existing.Name.Equals(item.Name, StringComparison.OrdinalIgnoreCase));

                if (exercise is null)
                {
                    exercise = new Exercise
                    {
                        UserId = "system",
                        Name = item.Name,
                        Description = item.Description,
                        Category = item.Category,
                        DefaultUnit = item.DefaultUnit,
                        TrackingFieldsJson = JsonSerializer.Serialize(
                            GetDefaultTrackingFields(item)),
                        IsBuiltIn = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    exercises.Add(exercise);
                    _ = dbContext.Exercises.Add(exercise);
                }

                exercise.ExerciseSportFolders.Add(new ExerciseSportFolder
                {
                    SportFolder = folder
                });
                hasChanges = true;
            }
        }

        if (hasChanges)
        {
            await dbContext.SaveChangesAsync();
        }
    }

    private static void ApplyDefaultTrackingFields(
        Exercise exercise,
        CatalogExercise item,
        ref bool hasChanges)
    {
        if (!exercise.IsBuiltIn ||
            (!string.IsNullOrWhiteSpace(exercise.TrackingFieldsJson) &&
             exercise.TrackingFieldsJson != "[]"))
        {
            return;
        }

        exercise.TrackingFieldsJson = JsonSerializer.Serialize(
            GetDefaultTrackingFields(item));
        exercise.UpdatedAt = DateTime.UtcNow;
        hasChanges = true;
    }

    private static string[] GetDefaultTrackingFields(CatalogExercise item)
    {
        return item.Sport switch
        {
            "Running" or "Walking" => ["Duration", "Distance", "Pace", "Calories", "Notes"],
            "Cycling" => ["Duration", "Distance", "Pace", "Elevation", "Calories", "Notes"],
            "Swimming" => ["Duration", "Distance", "Pace", "Calories", "Notes"],
            "Gym" => ["Sets", "Repetitions", "Weight", "Notes"],
            "Calisthenics" => ["Sets", "Repetitions", "Duration", "Notes"],
            "Hiking" => ["Duration", "Distance", "Elevation", "Calories", "Notes"],
            "Yoga" => ["Duration", "Notes"],
            _ => ["Duration", "Repetitions", "Calories", "Notes"]
        };
    }
}
