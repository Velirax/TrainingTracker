using System.Globalization;
using System.Text;
using TrainingTracker.Api.Dtos;

namespace TrainingTracker.Api.Services;

/// <summary>
/// Samsung Health's "download my data" export has no public spec and its column
/// names/formats have drifted across app versions and regions. This parser is
/// intentionally tolerant: it scans for a header row using keyword hints, matches
/// columns by alias, and accepts either millisecond epochs or common date-time
/// strings. Rows it can't confidently place (no parsable start time, or an
/// end/duration it can't derive) are skipped rather than guessed at.
/// </summary>
public static class SamsungHealthCsvParser
{
    private static readonly string[] StartTimeAliases =
        ["start_time", "starttime", "start time", "sdate", "start date"];

    private static readonly string[] EndTimeAliases =
        ["end_time", "endtime", "end time", "edate", "end date"];

    private static readonly string[] DurationAliases =
        ["duration"];

    private static readonly string[] CalorieAliases =
        ["calorie", "calories"];

    private static readonly string[] SportAliases =
        ["exercise_type", "exercise_custom_type", "exercise_name", "exercise name", "activity_type", "activity name", "comment"];

    private static readonly string[] HeaderKeywords =
        ["start_time", "starttime", "start time", "sdate", "exercise_type", "duration", "calorie"];

    public static List<SamsungHealthImportRowDto> Parse(List<string> lines)
    {
        var headerRowIndex = FindHeaderRowIndex(lines);

        if (headerRowIndex < 0)
        {
            return [];
        }

        var headers = SplitCsvLine(lines[headerRowIndex])
            .Select(header => header.Trim().Trim('"').ToLowerInvariant())
            .ToList();

        var startCol = FindColumn(headers, StartTimeAliases, []);
        if (startCol < 0)
        {
            return [];
        }

        var endCol = FindColumn(headers, EndTimeAliases, [startCol]);
        var durationCol = FindColumn(headers, DurationAliases, [startCol, endCol]);
        var calorieCol = FindColumn(headers, CalorieAliases, []);
        var sportCol = FindColumn(headers, SportAliases, []);

        var results = new List<SamsungHealthImportRowDto>();

        for (var lineIndex = headerRowIndex + 1; lineIndex < lines.Count; lineIndex++)
        {
            var fields = SplitCsvLine(lines[lineIndex]);

            if (fields.Count <= startCol)
            {
                continue;
            }

            var start = ParseTimestamp(Cell(fields, startCol));
            if (start is null)
            {
                continue;
            }

            var end = ParseTimestamp(Cell(fields, endCol));

            if (end is null)
            {
                var durationMinutesFromColumn = ParseDurationMinutes(Cell(fields, durationCol));
                if (durationMinutesFromColumn is null)
                {
                    continue;
                }

                end = start.Value.AddMinutes(durationMinutesFromColumn.Value);
            }

            if (end <= start)
            {
                continue;
            }

            var startTime = TimeOnly.FromDateTime(start.Value);
            var endTime = TimeOnly.FromDateTime(end.Value);

            // Sessions can't cross midnight in this app's model; skip rather than
            // record a nonsensical (or accidentally reversed) time-of-day pair.
            if (endTime <= startTime)
            {
                continue;
            }

            int? calories = null;
            var calorieRaw = Cell(fields, calorieCol);
            if (calorieRaw is not null &&
                double.TryParse(calorieRaw, NumberStyles.Any, CultureInfo.InvariantCulture, out var calorieValue) &&
                calorieValue > 0)
            {
                calories = (int)Math.Round(calorieValue);
            }

            string? sportLabel = null;
            var sportRaw = Cell(fields, sportCol);
            if (!string.IsNullOrWhiteSpace(sportRaw) &&
                !double.TryParse(sportRaw, NumberStyles.Any, CultureInfo.InvariantCulture, out _))
            {
                sportLabel = sportRaw;
            }

            results.Add(new SamsungHealthImportRowDto
            {
                RowIndex = results.Count,
                SessionDate = DateOnly.FromDateTime(start.Value),
                StartTime = startTime,
                EndTime = endTime,
                DurationMinutes = (int)(end.Value - start.Value).TotalMinutes,
                Calories = calories,
                RawSportLabel = sportLabel
            });
        }

        return results;
    }

    private static string? Cell(List<string> fields, int column)
    {
        if (column < 0 || column >= fields.Count)
        {
            return null;
        }

        var value = fields[column].Trim().Trim('"').Trim();
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }

    private static int FindHeaderRowIndex(List<string> lines)
    {
        var scanLimit = Math.Min(lines.Count, 5);

        for (var index = 0; index < scanLimit; index++)
        {
            var lower = lines[index].ToLowerInvariant();
            var hits = HeaderKeywords.Count(keyword => lower.Contains(keyword));

            if (hits >= 2)
            {
                return index;
            }
        }

        return -1;
    }

    private static int FindColumn(List<string> headers, string[] aliases, int[] exclude)
    {
        for (var index = 0; index < headers.Count; index++)
        {
            if (exclude.Contains(index))
            {
                continue;
            }

            var header = headers[index];

            if (aliases.Any(alias =>
                header == alias ||
                header.EndsWith("." + alias, StringComparison.Ordinal) ||
                header.Contains(alias, StringComparison.Ordinal)))
            {
                return index;
            }
        }

        return -1;
    }

    private static readonly string[] TimestampFormats =
    [
        "yyyy-MM-dd HH:mm:ss.fff",
        "yyyy-MM-dd HH:mm:ss",
        "yyyy-MM-ddTHH:mm:ss.fffZ",
        "yyyy-MM-ddTHH:mm:ssZ",
        "yyyy-MM-ddTHH:mm:ss",
        "MM/dd/yyyy HH:mm:ss",
        "yyyy.MM.dd HH:mm",
        "yyyy-MM-dd",
    ];

    private static DateTime? ParseTimestamp(string? raw)
    {
        if (raw is null)
        {
            return null;
        }

        if (long.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var numeric) && numeric > 0)
        {
            try
            {
                return raw.Length >= 13
                    ? DateTimeOffset.FromUnixTimeMilliseconds(numeric).LocalDateTime
                    : DateTimeOffset.FromUnixTimeSeconds(numeric).LocalDateTime;
            }
            catch (ArgumentOutOfRangeException)
            {
                return null;
            }
        }

        if (DateTime.TryParseExact(raw, TimestampFormats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var exact))
        {
            return exact;
        }

        return DateTime.TryParse(raw, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed)
            ? parsed
            : null;
    }

    private static int? ParseDurationMinutes(string? raw)
    {
        if (raw is null ||
            !double.TryParse(raw, NumberStyles.Any, CultureInfo.InvariantCulture, out var value) ||
            value <= 0)
        {
            return null;
        }

        // Samsung Health typically stores duration in milliseconds; treat small
        // values as already-minutes rather than assume every export agrees.
        var minutes = value > 1000 ? value / 60000.0 : value;
        return (int)Math.Round(minutes);
    }

    private static List<string> SplitCsvLine(string line)
    {
        var fields = new List<string>();
        var current = new StringBuilder();
        var inQuotes = false;

        foreach (var character in line)
        {
            if (character == '"')
            {
                inQuotes = !inQuotes;
            }
            else if (character == ',' && !inQuotes)
            {
                fields.Add(current.ToString());
                current.Clear();
            }
            else
            {
                current.Append(character);
            }
        }

        fields.Add(current.ToString());
        return fields;
    }
}
