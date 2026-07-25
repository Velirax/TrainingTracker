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
}