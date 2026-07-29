using System.Globalization;
using TrainingTracker.Api.Dtos;
using static TrainingTracker.Api.Services.CsvParsingHelpers;

namespace TrainingTracker.Api.Services;

/// <summary>
/// Parses Samsung Health's daily step-count export (a separate CSV from the
/// exercise one, typically named around "pedometer_day_summary"). Same
/// tolerant-parsing approach as <see cref="SamsungHealthCsvParser"/>: alias-match
/// columns, accept epoch or date-string values. If a date appears more than once
/// (e.g. overlapping export ranges, or multiple intraday snapshots), the highest
/// count seen for that date wins rather than summing — Samsung's day-summary
/// count is a running daily total, not a per-row delta.
/// </summary>
public static class SamsungHealthStepsCsvParser
{
    private static readonly string[] DateAliases =
        ["day_time", "create_time", "update_time", "date", "start_time"];

    private static readonly string[] CountAliases =
        ["step_count", "count", "steps"];

    private static readonly string[] HeaderKeywords =
        ["day_time", "create_time", "count", "step_count", "steps", "date"];

    public static List<SamsungHealthStepsImportRow> Parse(List<string> lines)
    {
        var headerRowIndex = FindHeaderRowIndex(lines, HeaderKeywords);

        if (headerRowIndex < 0)
        {
            return [];
        }

        var headers = SplitCsvLine(lines[headerRowIndex])
            .Select(header => header.Trim().Trim('"').ToLowerInvariant())
            .ToList();

        var dateCol = FindColumn(headers, DateAliases, []);
        var countCol = FindColumn(headers, CountAliases, [dateCol]);

        if (dateCol < 0 || countCol < 0)
        {
            return [];
        }

        var bestCountByDate = new Dictionary<DateOnly, int>();

        for (var lineIndex = headerRowIndex + 1; lineIndex < lines.Count; lineIndex++)
        {
            var fields = SplitCsvLine(lines[lineIndex]);

            var timestamp = ParseTimestamp(Cell(fields, dateCol));
            if (timestamp is null)
            {
                continue;
            }

            var countRaw = Cell(fields, countCol);
            if (countRaw is null ||
                !double.TryParse(countRaw, NumberStyles.Any, CultureInfo.InvariantCulture, out var countValue) ||
                countValue < 0)
            {
                continue;
            }

            var date = DateOnly.FromDateTime(timestamp.Value);
            var count = (int)Math.Round(countValue);

            if (!bestCountByDate.TryGetValue(date, out var existing) || count > existing)
            {
                bestCountByDate[date] = count;
            }
        }

        return bestCountByDate
            .OrderBy(entry => entry.Key)
            .Select(entry => new SamsungHealthStepsImportRow { Date = entry.Key, StepCount = entry.Value })
            .ToList();
    }
}
