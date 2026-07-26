namespace TrainingTracker.Api.Models;

public static class ExerciseTrackingFields
{
    private static readonly string[] AllowedFields =
    [
        "Sets",
        "Repetitions",
        "Weight",
        "Duration",
        "Distance",
        "Pace",
        "Elevation",
        "Calories",
        "Notes"
    ];

    public static bool TryNormalize(
        IEnumerable<string>? fields,
        out List<string> normalizedFields)
    {
        normalizedFields = [];

        if (fields is null)
        {
            return true;
        }

        foreach (var field in fields)
        {
            var matchingField = AllowedFields.FirstOrDefault(allowed =>
                allowed.Equals(field?.Trim(), StringComparison.OrdinalIgnoreCase));

            if (matchingField is null)
            {
                return false;
            }

            if (!normalizedFields.Contains(matchingField))
            {
                normalizedFields.Add(matchingField);
            }
        }

        return true;
    }
}
