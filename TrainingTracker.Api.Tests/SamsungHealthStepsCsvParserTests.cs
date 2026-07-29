using TrainingTracker.Api.Services;

namespace TrainingTracker.Api.Tests;

public class SamsungHealthStepsCsvParserTests
{
    [Fact]
    public void Parse_reads_date_and_step_count_from_a_simple_export()
    {
        var lines = new List<string>
        {
            "com.samsung.shealth.tracker.pedometer_day_summary,7006003,7",
            "day_time,step_count",
            "2026-07-20 00:00:00.000,8234",
        };

        var rows = SamsungHealthStepsCsvParser.Parse(lines);

        var row = Assert.Single(rows);
        Assert.Equal(new DateOnly(2026, 7, 20), row.Date);
        Assert.Equal(8234, row.StepCount);
    }

    [Fact]
    public void Parse_prefers_day_time_over_update_time_even_though_update_time_appears_first()
    {
        // Regression test mirroring a real Samsung Health export: the day summary
        // file has both "update_time" (sync metadata, can drift onto a different
        // calendar day) and "day_time" (the actual day the total covers) as exact
        // column names, with update_time listed earlier. day_time must win.
        var lines = new List<string>
        {
            "com.samsung.shealth.tracker.pedometer_day_summary,7006003,7",
            "update_time,step_count,day_time",
            "2026-07-21 23:58:00.000,8234,2026-07-20 00:00:00.000",
        };

        var rows = SamsungHealthStepsCsvParser.Parse(lines);

        Assert.Equal(new DateOnly(2026, 7, 20), Assert.Single(rows).Date);
    }

    [Fact]
    public void Parse_takes_the_highest_count_when_a_date_has_multiple_rows()
    {
        // Samsung reconciles readings from multiple devices (phone + watch) into
        // duplicate rows for the same day; the day-summary count is a running
        // daily total, not a per-row delta, so the max (not the sum) is correct.
        var lines = new List<string>
        {
            "header,meta",
            "day_time,step_count",
            "2026-07-20 00:00:00.000,7020",
            "2026-07-20 00:00:00.000,7020",
        };

        var rows = SamsungHealthStepsCsvParser.Parse(lines);

        var row = Assert.Single(rows);
        Assert.Equal(7020, row.StepCount);
    }

    [Fact]
    public void Parse_deduplicates_by_taking_the_max_not_the_sum()
    {
        var lines = new List<string>
        {
            "header,meta",
            "day_time,step_count",
            "2026-07-20 00:00:00.000,4000",
            "2026-07-20 00:00:00.000,9000",
        };

        var rows = SamsungHealthStepsCsvParser.Parse(lines);

        Assert.Equal(9000, Assert.Single(rows).StepCount);
    }

    [Fact]
    public void Parse_skips_a_row_with_a_negative_count()
    {
        var lines = new List<string>
        {
            "header,meta",
            "day_time,step_count",
            "2026-07-20 00:00:00.000,-5",
        };

        Assert.Empty(SamsungHealthStepsCsvParser.Parse(lines));
    }

    [Fact]
    public void Parse_skips_a_row_with_an_unparseable_date()
    {
        var lines = new List<string>
        {
            "header,meta",
            "day_time,step_count",
            "not-a-date,8234",
        };

        Assert.Empty(SamsungHealthStepsCsvParser.Parse(lines));
    }

    [Fact]
    public void Parse_returns_rows_sorted_by_date()
    {
        var lines = new List<string>
        {
            "header,meta",
            "day_time,step_count",
            "2026-07-22 00:00:00.000,4021",
            "2026-07-20 00:00:00.000,8234",
            "2026-07-21 00:00:00.000,11987",
        };

        var rows = SamsungHealthStepsCsvParser.Parse(lines);

        Assert.Equal([new DateOnly(2026, 7, 20), new DateOnly(2026, 7, 21), new DateOnly(2026, 7, 22)],
            rows.Select(row => row.Date));
    }

    [Fact]
    public void Parse_returns_empty_when_no_count_column_is_found()
    {
        var lines = new List<string>
        {
            "header,meta",
            "day_time,distance",
            "2026-07-20 00:00:00.000,5000",
        };

        Assert.Empty(SamsungHealthStepsCsvParser.Parse(lines));
    }

    [Fact]
    public void Parse_returns_empty_when_no_header_row_is_found()
    {
        var lines = new List<string> { "nonsense,line", "1,2,3" };

        Assert.Empty(SamsungHealthStepsCsvParser.Parse(lines));
    }
}
