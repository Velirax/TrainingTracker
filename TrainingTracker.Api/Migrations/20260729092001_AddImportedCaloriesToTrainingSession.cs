using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TrainingTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddImportedCaloriesToTrainingSession : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ImportedCalories",
                table: "TrainingSessions",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ImportedCalories",
                table: "TrainingSessions");
        }
    }
}
