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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<TrainingSession>()
            .HasOne(session => session.SportFolder)
            .WithMany(folder => folder.TrainingSessions)
            .HasForeignKey(session => session.SportFolderId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}