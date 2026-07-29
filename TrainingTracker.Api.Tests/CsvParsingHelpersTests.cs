using TrainingTracker.Api.Services;

namespace TrainingTracker.Api.Tests;

public class CsvParsingHelpersTests
{
    [Fact]
    public void SplitCsvLine_splits_on_commas()
    {
        var fields = CsvParsingHelpers.SplitCsvLine("a,b,c");

        Assert.Equal(["a", "b", "c"], fields);
    }

    [Fact]
    public void SplitCsvLine_keeps_commas_inside_quotes_together()
    {
        var fields = CsvParsingHelpers.SplitCsvLine("a,\"b,still-b\",c");

        Assert.Equal(["a", "b,still-b", "c"], fields);
    }

    [Fact]
    public void SplitCsvLine_preserves_empty_fields()
    {
        var fields = CsvParsingHelpers.SplitCsvLine(",,1,,");

        Assert.Equal(["", "", "1", "", ""], fields);
    }

    [Fact]
    public void Cell_returns_null_for_blank_or_whitespace_values()
    {
        var fields = new List<string> { "", "   ", "\"\"", "real" };

        Assert.Null(CsvParsingHelpers.Cell(fields, 0));
        Assert.Null(CsvParsingHelpers.Cell(fields, 1));
        Assert.Null(CsvParsingHelpers.Cell(fields, 2));
        Assert.Equal("real", CsvParsingHelpers.Cell(fields, 3));
    }

    [Fact]
    public void Cell_returns_null_for_out_of_range_or_negative_column()
    {
        var fields = new List<string> { "a" };

        Assert.Null(CsvParsingHelpers.Cell(fields, -1));
        Assert.Null(CsvParsingHelpers.Cell(fields, 5));
    }

    [Fact]
    public void FindHeaderRowIndex_skips_a_leading_metadata_line()
    {
        var lines = new List<string>
        {
            "com.samsung.health.exercise,7006003,17",
            "start_time,end_time,calorie",
            "2026-01-01 08:00:00.000,2026-01-01 09:00:00.000,300",
        };

        var index = CsvParsingHelpers.FindHeaderRowIndex(lines, ["start_time", "calorie"]);

        Assert.Equal(1, index);
    }

    [Fact]
    public void FindHeaderRowIndex_returns_minus_one_when_no_row_has_enough_keyword_hits()
    {
        var lines = new List<string> { "foo,bar,baz", "1,2,3" };

        var index = CsvParsingHelpers.FindHeaderRowIndex(lines, ["start_time", "calorie"]);

        Assert.Equal(-1, index);
    }

    [Fact]
    public void FindColumn_prefers_a_namespaced_suffix_match_over_a_bare_substring_decoy()
    {
        // Regression test for a real bug: Samsung Health's exercise export has an
        // always-empty "total_calorie" column earlier in the file than the real,
        // working "com.samsung.health.exercise.calorie" column. A naive
        // left-to-right substring scan picks the decoy every time.
        var headers = new List<string> { "total_calorie", "com.samsung.health.exercise.calorie" };

        var column = CsvParsingHelpers.FindColumn(headers, ["calorie", "calories"], []);

        Assert.Equal(1, column);
    }

    [Fact]
    public void FindColumn_prefers_an_exact_match_over_a_namespaced_suffix_match()
    {
        var headers = new List<string> { "com.samsung.health.step_count.update_time", "day_time" };

        var column = CsvParsingHelpers.FindColumn(headers, ["day_time", "update_time"], []);

        Assert.Equal(1, column);
    }

    [Fact]
    public void FindColumn_respects_alias_priority_when_both_are_exact_matches()
    {
        // Regression test for a real bug: a pedometer_day_summary export has both
        // "update_time" (sync metadata) and "day_time" (the actual day the summary
        // covers) as exact-match column names. The first-declared alias should win
        // regardless of which column appears earlier in the file.
        var headers = new List<string> { "update_time", "day_time" };

        var column = CsvParsingHelpers.FindColumn(headers, ["day_time", "update_time"], []);

        Assert.Equal(1, column);
    }

    [Fact]
    public void FindColumn_skips_excluded_indexes()
    {
        var headers = new List<string> { "start_time", "start_time" };

        var column = CsvParsingHelpers.FindColumn(headers, ["start_time"], [0]);

        Assert.Equal(1, column);
    }

    [Fact]
    public void FindColumn_returns_minus_one_when_nothing_matches()
    {
        var headers = new List<string> { "foo", "bar" };

        var column = CsvParsingHelpers.FindColumn(headers, ["calorie"], []);

        Assert.Equal(-1, column);
    }

    [Fact]
    public void ParseTimestamp_returns_null_for_null_input()
    {
        Assert.Null(CsvParsingHelpers.ParseTimestamp(null));
    }

    [Fact]
    public void ParseTimestamp_parses_samsung_style_date_with_milliseconds()
    {
        var result = CsvParsingHelpers.ParseTimestamp("2026-07-20 07:15:00.000");

        Assert.Equal(new DateTime(2026, 7, 20, 7, 15, 0), result);
    }

    [Fact]
    public void ParseTimestamp_parses_a_bare_date()
    {
        var result = CsvParsingHelpers.ParseTimestamp("2026-07-20");

        Assert.Equal(new DateTime(2026, 7, 20), result);
    }

    [Fact]
    public void ParseTimestamp_treats_a_13_digit_number_as_epoch_milliseconds()
    {
        var expected = DateTimeOffset.FromUnixTimeMilliseconds(1_753_000_000_000).LocalDateTime;

        var result = CsvParsingHelpers.ParseTimestamp("1753000000000");

        Assert.Equal(expected, result);
    }

    [Fact]
    public void ParseTimestamp_treats_a_10_digit_number_as_epoch_seconds()
    {
        var expected = DateTimeOffset.FromUnixTimeSeconds(1_753_000_000).LocalDateTime;

        var result = CsvParsingHelpers.ParseTimestamp("1753000000");

        Assert.Equal(expected, result);
    }

    [Fact]
    public void ParseTimestamp_returns_null_for_garbage_text()
    {
        Assert.Null(CsvParsingHelpers.ParseTimestamp("not-a-date"));
    }
}
