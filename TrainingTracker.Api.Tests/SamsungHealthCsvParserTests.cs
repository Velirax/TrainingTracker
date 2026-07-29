using TrainingTracker.Api.Services;

namespace TrainingTracker.Api.Tests;

public class SamsungHealthCsvParserTests
{
    [Fact]
    public void Parse_reads_start_end_and_calorie_from_a_simple_export()
    {
        var lines = new List<string>
        {
            "com.samsung.health.exercise,7006003,17",
            "start_time,end_time,calorie",
            "2026-07-20 07:15:00.000,2026-07-20 08:05:00.000,410",
        };

        var rows = SamsungHealthCsvParser.Parse(lines);

        var row = Assert.Single(rows);
        Assert.Equal(new DateOnly(2026, 7, 20), row.SessionDate);
        Assert.Equal(new TimeOnly(7, 15), row.StartTime);
        Assert.Equal(new TimeOnly(8, 5), row.EndTime);
        Assert.Equal(50, row.DurationMinutes);
        Assert.Equal(410, row.Calories);
    }

    [Fact]
    public void Parse_prefers_the_real_calorie_column_over_a_decoy_earlier_in_the_file()
    {
        // Regression test for a real bug found against an actual Samsung Health
        // export: "total_calorie" is an always-empty legacy column that sits
        // before the real, working "com.samsung.health.exercise.calorie" column.
        // Before the FindColumn fix, every imported session silently lost its
        // real calorie reading and fell back to the MET estimate.
        var lines = new List<string>
        {
            "com.samsung.health.exercise,7006003,17",
            "total_calorie,com.samsung.health.exercise.start_time,com.samsung.health.exercise.end_time,com.samsung.health.exercise.calorie",
            ",2026-04-05 11:55:00.000,2026-04-05 12:32:00.000,128.74",
        };

        var rows = SamsungHealthCsvParser.Parse(lines);

        var row = Assert.Single(rows);
        Assert.Equal(129, row.Calories);
    }

    [Fact]
    public void Parse_derives_end_time_from_a_duration_column_when_end_time_is_missing()
    {
        var lines = new List<string>
        {
            "header,meta",
            "start_time,duration,calorie",
            "2026-07-20 07:15:00.000,2220000,",
        };

        var rows = SamsungHealthCsvParser.Parse(lines);

        var row = Assert.Single(rows);
        Assert.Equal(new TimeOnly(7, 15), row.StartTime);
        Assert.Equal(new TimeOnly(7, 52), row.EndTime);
        Assert.Equal(37, row.DurationMinutes);
        Assert.Null(row.Calories);
    }

    [Fact]
    public void Parse_leaves_sport_label_null_for_a_numeric_exercise_type_code()
    {
        // Samsung's exercise_type is an internal numeric code (e.g. 1001) with no
        // reliable public mapping. Guessing a sport from it would risk silently
        // mis-classifying sessions, so it must be left for the user to assign.
        var lines = new List<string>
        {
            "header,meta",
            "start_time,end_time,exercise_type",
            "2026-07-20 07:15:00.000,2026-07-20 08:00:00.000,1001",
        };

        var rows = SamsungHealthCsvParser.Parse(lines);

        Assert.Null(Assert.Single(rows).RawSportLabel);
    }

    [Fact]
    public void Parse_captures_a_readable_sport_label_when_present()
    {
        var lines = new List<string>
        {
            "header,meta",
            "start_time,end_time,exercise_type",
            "2026-07-20 07:15:00.000,2026-07-20 08:00:00.000,Basketball",
        };

        var rows = SamsungHealthCsvParser.Parse(lines);

        Assert.Equal("Basketball", Assert.Single(rows).RawSportLabel);
    }

    [Fact]
    public void Parse_skips_a_row_with_an_unparseable_start_time()
    {
        var lines = new List<string>
        {
            "header,meta",
            "start_time,end_time,calorie",
            "not-a-date,2026-07-20 08:00:00.000,300",
        };

        Assert.Empty(SamsungHealthCsvParser.Parse(lines));
    }

    [Fact]
    public void Parse_skips_a_row_where_end_time_is_not_after_start_time()
    {
        var lines = new List<string>
        {
            "header,meta",
            "start_time,end_time,calorie",
            "2026-07-20 23:50:00.000,2026-07-21 00:10:00.000,300",
        };

        // End is on the next calendar day (crosses midnight), which this app's
        // session model can't represent - must be skipped, not silently wrapped.
        Assert.Empty(SamsungHealthCsvParser.Parse(lines));
    }

    [Fact]
    public void Parse_returns_empty_when_no_header_row_is_found()
    {
        var lines = new List<string> { "nonsense,line", "1,2,3" };

        Assert.Empty(SamsungHealthCsvParser.Parse(lines));
    }

    [Fact]
    public void Parse_returns_empty_when_there_is_no_start_time_column()
    {
        var lines = new List<string>
        {
            "header,meta",
            "calorie,duration",
            "300,60",
        };

        Assert.Empty(SamsungHealthCsvParser.Parse(lines));
    }

    [Fact]
    public void Parse_handles_multiple_rows_independently()
    {
        var lines = new List<string>
        {
            "header,meta",
            "start_time,end_time,calorie",
            "2026-07-20 07:15:00.000,2026-07-20 08:05:00.000,410",
            "2026-07-21 18:00:00.000,2026-07-21 18:45:00.000,",
        };

        var rows = SamsungHealthCsvParser.Parse(lines);

        Assert.Equal(2, rows.Count);
        Assert.Equal(410, rows[0].Calories);
        Assert.Null(rows[1].Calories);
        Assert.Equal(0, rows[0].RowIndex);
        Assert.Equal(1, rows[1].RowIndex);
    }
}
