using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TrainingTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUserWeight : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "WeightKg",
                table: "Users",
                type: "float",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WeightKg",
                table: "Users");
        }
    }
}
