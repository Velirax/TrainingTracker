using System.Globalization;
using System.Text;

namespace TrainingTracker.Api.Services;

/// <summary>
/// Shared low-level helpers for parsing loosely-specified CSV exports (currently
/// Samsung Health's, which has no public format spec). Kept generic — no
/// Samsung-specific column names live here, only quoting/date/header mechanics.
/// </summary>
public static class CsvParsingHelpers
{
    public static List<string> SplitCsvLine(string line)
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

    public static string? Cell(List<string> fields, int column)
    {
        if (column < 0 || column >= fields.Count)
        {
            return null;
        }

        var value = fields[column].Trim().Trim('"').Trim();
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }

    public static int FindHeaderRowIndex(List<string> lines, string[] keywords, int minHits = 2)
    {
        var scanLimit = Math.Min(lines.Count, 5);

        for (var index = 0; index < scanLimit; index++)
        {
            var lower = lines[index].ToLowerInvariant();
            var hits = keywords.Count(keyword => lower.Contains(keyword));

            if (hits >= minHits)
            {
                return index;
            }
        }

        return -1;
    }

    // Real Samsung Health exports have decoy columns (e.g. an always-empty
    // "total_calorie" alongside the real, namespaced "com.samsung.health.exercise.calorie").
    // Checking every alias at one match quality before loosening to the next
    // — rather than scanning headers left-to-right and taking the first hit —
    // keeps a strong match from losing to a weaker one that merely appears earlier.
    public static int FindColumn(List<string> headers, string[] aliases, int[] exclude)
    {
        var exactMatch = FindColumnByPredicate(headers, aliases, exclude,
            (header, alias) => header == alias);
        if (exactMatch >= 0) return exactMatch;

        var namespacedMatch = FindColumnByPredicate(headers, aliases, exclude,
            (header, alias) => header.EndsWith("." + alias, StringComparison.Ordinal));
        if (namespacedMatch >= 0) return namespacedMatch;

        return FindColumnByPredicate(headers, aliases, exclude,
            (header, alias) => header.Contains(alias, StringComparison.Ordinal));
    }

    private static int FindColumnByPredicate(
        List<string> headers,
        string[] aliases,
        int[] exclude,
        Func<string, string, bool> matches)
    {
        foreach (var alias in aliases)
        {
            for (var index = 0; index < headers.Count; index++)
            {
                if (exclude.Contains(index))
                {
                    continue;
                }

                if (matches(headers[index], alias))
                {
                    return index;
                }
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

    public static DateTime? ParseTimestamp(string? raw)
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
}
