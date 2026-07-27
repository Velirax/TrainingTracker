using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TrainingTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUserPreferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DefaultCalendarView",
                table: "Users",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "week");

            migrationBuilder.AddColumn<string>(
                name: "DistanceUnit",
                table: "Users",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "km");

            migrationBuilder.AddColumn<int>(
                name: "WeekStartsOn",
                table: "Users",
                type: "int",
                nullable: false,
                defaultValue: 1);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DefaultCalendarView",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "DistanceUnit",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "WeekStartsOn",
                table: "Users");
        }
    }
}
