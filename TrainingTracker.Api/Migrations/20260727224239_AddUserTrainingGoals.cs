using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TrainingTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUserTrainingGoals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MonthlyMinutesGoal",
                table: "Users",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MonthlySessionGoal",
                table: "Users",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "WeeklyMinutesGoal",
                table: "Users",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "WeeklySessionGoal",
                table: "Users",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MonthlyMinutesGoal",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "MonthlySessionGoal",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "WeeklyMinutesGoal",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "WeeklySessionGoal",
                table: "Users");
        }
    }
}
