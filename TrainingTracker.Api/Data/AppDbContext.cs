using Microsoft.EntityFrameworkCore;
using TrainingTracker.Api.Models;

namespace TrainingTracker.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<SportFolder> SportFolders { get; set; }
    public DbSet<TrainingSession> TrainingSessions { get; set; }
    public DbSet<TrainingSessionExercise> TrainingSessionExercises { get; set; }
    public DbSet<Exercise> Exercises { get; set; }
    public DbSet<ExerciseSportFolder> ExerciseSportFolders { get; set; }
    public DbSet<AppUser> Users { get; set; }
    public DbSet<WorkoutTemplate> WorkoutTemplates { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<AppUser>().HasIndex(user => user.Email).IsUnique();

        modelBuilder.Entity<TrainingSession>()
            .HasOne(session => session.SportFolder)
            .WithMany(folder => folder.TrainingSessions)
            .HasForeignKey(session => session.SportFolderId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ExerciseSportFolder>()
            .HasKey(link => new { link.ExerciseId, link.SportFolderId });

        modelBuilder.Entity<ExerciseSportFolder>()
            .HasOne(link => link.Exercise)
            .WithMany(exercise => exercise.ExerciseSportFolders)
            .HasForeignKey(link => link.ExerciseId);

        modelBuilder.Entity<ExerciseSportFolder>()
            .HasOne(link => link.SportFolder)
            .WithMany(folder => folder.ExerciseSportFolders)
            .HasForeignKey(link => link.SportFolderId);

        modelBuilder.Entity<TrainingSessionExercise>()
            .HasOne(item => item.TrainingSession)
            .WithMany(session => session.Exercises)
            .HasForeignKey(item => item.TrainingSessionId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TrainingSessionExercise>()
            .HasOne(item => item.Exercise)
            .WithMany(exercise => exercise.TrainingSessionExercises)
            .HasForeignKey(item => item.ExerciseId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
