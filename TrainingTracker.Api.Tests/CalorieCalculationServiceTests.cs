using TrainingTracker.Api.Services;

namespace TrainingTracker.Api.Tests;

public class CalorieCalculationServiceTests
{
    [Fact]
    public void GetMet_returns_the_known_value_for_a_built_in_sport()
    {
        Assert.Equal(6.5, CalorieCalculationService.GetMet("Basketball"));
    }

    [Fact]
    public void GetMet_is_case_insensitive()
    {
        Assert.Equal(6.5, CalorieCalculationService.GetMet("basketball"));
        Assert.Equal(6.5, CalorieCalculationService.GetMet("BASKETBALL"));
    }

    [Fact]
    public void GetMet_falls_back_to_the_default_for_an_unknown_sport()
    {
        Assert.Equal(5.0, CalorieCalculationService.GetMet("Some Custom Sport"));
    }

    [Fact]
    public void EstimateCalories_matches_the_met_times_weight_times_hours_formula()
    {
        // Basketball MET 6.5, 90kg, 60 minutes -> 6.5 * 90 * 1.0 = 585
        var calories = CalorieCalculationService.EstimateCalories("Basketball", 60, 90);

        Assert.Equal(585, calories);
    }

    [Fact]
    public void EstimateCalories_uses_the_70kg_reference_weight_when_none_is_set()
    {
        // Basketball MET 6.5, default 70kg, 60 minutes -> 6.5 * 70 * 1.0 = 455
        var calories = CalorieCalculationService.EstimateCalories("Basketball", 60, null);

        Assert.Equal(455, calories);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-10)]
    public void EstimateCalories_uses_the_reference_weight_for_non_positive_weight(double weight)
    {
        var calories = CalorieCalculationService.EstimateCalories("Basketball", 60, weight);

        Assert.Equal(455, calories);
    }

    [Fact]
    public void EstimateCalories_scales_with_duration()
    {
        var thirtyMinutes = CalorieCalculationService.EstimateCalories("Running", 30, 70);
        var sixtyMinutes = CalorieCalculationService.EstimateCalories("Running", 60, 70);

        Assert.Equal(sixtyMinutes, thirtyMinutes * 2);
    }

    [Fact]
    public void EstimateCalories_returns_zero_for_zero_duration()
    {
        Assert.Equal(0, CalorieCalculationService.EstimateCalories("Running", 0, 70));
    }
}
