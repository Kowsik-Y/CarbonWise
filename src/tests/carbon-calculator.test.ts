import { describe, it, expect } from "vitest";
import { calculateCarbonFootprint, getCarbonEquivalents } from "../utils/carbon-calculator";
import { generateCoachingResponse } from "../services/ai-coach";

describe("Carbon Footprint Calculator", () => {
  it("should calculate accurate emissions for low-emissions lifestyle", () => {
    const input = {
      transportKm: 10,
      transportType: "public_transit", // 0.03 kg/km
      electricityBill: 30,             // $30/month
      electricityKwh: 0,
      foodHabits: "vegan",             // 600 kg/yr
      shoppingHabits: "minimal",       // 400 kg/yr
      wasteHabits: "recycle_all",      // 100 kg/yr
    };

    const result = calculateCarbonFootprint(input);

    // Math check:
    // Transport: 10 * 365 * 0.03 = 109.5 -> ~110 kg
    // Energy: (30 / 0.15) * 12 * 0.38 = 912 kg
    // Diet: 600 kg
    // Shopping: 400 kg
    // Waste: 100 kg
    // Total annual: 110 + 912 + 600 + 400 + 100 = 2122 kg
    // Score: 100 - (2122 / 200) = 100 - 10.6 = 89

    expect(result.transportEmissions).toBeCloseTo(110, 0);
    expect(result.energyEmissions).toBeCloseTo(912, 0);
    expect(result.foodEmissions).toBe(600);
    expect(result.shoppingEmissions).toBe(400);
    expect(result.wasteEmissions).toBe(100);
    expect(result.annualFootprint).toBeCloseTo(2122, 0);
    expect(result.carbonScore).toBe(89);
  });

  it("should calculate accurate emissions for high-emissions lifestyle", () => {
    const input = {
      transportKm: 60,
      transportType: "car_petrol",     // 0.17 kg/km
      electricityBill: 150,            // $150/month
      electricityKwh: 0,
      foodHabits: "high_meat",         // 2800 kg/yr
      shoppingHabits: "heavy",         // 3000 kg/yr
      wasteHabits: "no_recycling",     // 600 kg/yr
    };

    const result = calculateCarbonFootprint(input);

    // Math check:
    // Transport: 60 * 365 * 0.17 = 3723 kg
    // Energy: (150 / 0.15) * 12 * 0.38 = 4560 kg
    // Diet: 2800 kg
    // Shopping: 3000 kg
    // Waste: 600 kg
    // Total annual: 3723 + 4560 + 2800 + 3000 + 600 = 14683 kg
    // Score: 100 - (14683 / 200) = 100 - 73.4 = 27

    expect(result.transportEmissions).toBeCloseTo(3723, 0);
    expect(result.energyEmissions).toBeCloseTo(4560, 0);
    expect(result.foodEmissions).toBe(2800);
    expect(result.shoppingEmissions).toBe(3000);
    expect(result.wasteEmissions).toBe(600);
    expect(result.annualFootprint).toBeCloseTo(14683, 0);
    expect(result.carbonScore).toBe(27);
  });

  it("should convert emissions into correct tangibles equivalents", () => {
    const co2 = 2200; // kg
    const eq = getCarbonEquivalents(co2);

    expect(eq.treesPlanted).toBe(100);       // 2200 / 22 = 100
    expect(eq.flightsSaved).toBe(9);         // 2200 / 250 = 8.8 -> 9
    expect(eq.carMilesAvoided).toBe(5500);   // 2200 / 0.4 = 5500
  });
});

describe("AI Coach Heuristic Responses", () => {
  it("should prompt to complete assessment if no profile exists", async () => {
    const response = await generateCoachingResponse("How do I save carbon?", null);
    expect(response).toContain("assessment wizard first");
  });

  it("should return category-aware responses for transport queries", async () => {
    const mockAssessment = {
      id: "test-id",
      userId: "user-id",
      transportKm: 40,
      transportType: "car_petrol",
      electricityBill: 100,
      electricityKwh: 0,
      foodHabits: "low_meat",
      shoppingHabits: "average",
      wasteHabits: "recycle_some",
      transportEmissions: 2482,
      energyEmissions: 3040,
      foodEmissions: 1600,
      shoppingEmissions: 1200,
      wasteEmissions: 300,
      monthlyFootprint: 718,
      annualFootprint: 8622,
      carbonScore: 57,
      createdAt: new Date(),
    };

    const response = await generateCoachingResponse("How can I lower my driving impact?", mockAssessment);

    expect(response).toContain("Transportation Assessment");
    expect(response).toContain("2482 kg CO₂e"); // matches rounded transport emissions
    expect(response).toContain("EV Transition");
  });
});
