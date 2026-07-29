namespace TrainingTracker.Api.Services;

/// <summary>
/// Estimates calories burned as MET x weight(kg) x duration(hours), the standard
/// formula for activity-based energy expenditure. MET values are drawn from the
/// 2011 Compendium of Physical Activities (Ainsworth et al.), matched to this
/// app's built-in sport folders; a moderate-exercise default covers any
/// user-created sport that isn't in the table.
/// </summary>
public static class CalorieCalculationService
{
    private static readonly Dictionary<string, double> MetBySport = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Running"] = 9.8,       // running, general (~10 min/mile pace)
        ["Cycling"] = 8.0,       // bicycling, general, moderate effort
        ["Swimming"] = 8.3,      // swimming laps, freestyle, moderate/vigorous
        ["Gym"] = 5.0,           // resistance/weight training, moderate effort
        ["Calisthenics"] = 8.0,  // calisthenics, vigorous effort
        ["Tennis"] = 7.3,        // tennis, general
        ["Padel"] = 6.0,         // not in the Compendium; estimated from racquetball/squash
        ["Football"] = 7.0,      // soccer, general
        ["Basketball"] = 6.5,    // basketball, general (practice/game blend)
        ["Hiking"] = 6.0,        // hiking, cross-country
        ["Yoga"] = 2.5,          // yoga, Hatha
        ["Walking"] = 3.5,       // walking, moderate pace
    };

    private const double DefaultMet = 5.0;
    private const double DefaultWeightKg = 70.0; // Compendium reference-person convention

    public static double GetMet(string sportName) => MetBySport.GetValueOrDefault(sportName, DefaultMet);

    public static int EstimateCalories(string sportName, int durationMinutes, double? weightKg)
    {
        var met = GetMet(sportName);
        var weight = weightKg is > 0 ? weightKg.Value : DefaultWeightKg;
        var hours = durationMinutes / 60.0;

        return (int)Math.Round(met * weight * hours);
    }
}
