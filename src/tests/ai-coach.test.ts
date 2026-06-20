import { vi, describe, it, expect, beforeEach } from "vitest";
import { 
  generateCoachingResponse, 
  generateEvaluationReport, 
  parseAssessmentFromText, 
  generateDynamicChallenges, 
  generateDynamicRecommendations, 
  generateSimulatorOptimization 
} from "@/services/ai-coach";
import { CarbonAssessment } from "@/types";

// Class-based mock of GoogleGenerativeAI to satisfy "new GoogleGenerativeAI(apiKey)" calls
vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: class {
      apiKey: string;
      constructor(apiKey: string) {
        this.apiKey = apiKey;
      }
      getGenerativeModel() {
        return {
          generateContent: async (prompt: string) => {
            if (prompt.includes("highly personalized weekly challenges")) {
              return {
                response: {
                  text: () => JSON.stringify([
                    {
                      code: "ai-test-1",
                      title: "Test Challenge 1",
                      description: "Reduce something",
                      category: "energy",
                      points: 100,
                      duration: "7 days",
                      difficulty: "easy"
                    },
                    {
                      code: "ai-test-2",
                      title: "Test Challenge 2",
                      description: "Reduce transport emissions",
                      category: "transport",
                      points: 150,
                      duration: "7 days",
                      difficulty: "medium"
                    }
                  ])
                }
              };
            }
            if (prompt.includes("custom recommended action goals")) {
              return {
                response: {
                  text: () => JSON.stringify([
                    { title: "Switch to LEDs", category: "energy", co2: 120, diff: "easy" },
                    { title: "Eat vegan meals", category: "food", co2: 200, diff: "medium" },
                    { title: "Carpool to work", category: "transport", co2: 300, diff: "medium" }
                  ])
                }
              };
            }
            if (prompt.includes("optimal simulation setup")) {
              return {
                response: {
                  text: () => JSON.stringify({
                    targetTransportKm: 15,
                    targetTransportType: "public_transit",
                    targetElectricityBill: 60,
                    targetFoodHabits: "vegetarian",
                    targetShoppingHabits: "minimal",
                    targetWasteHabits: "recycle_all"
                  })
                }
              };
            }
            // Default evaluation report template
            return {
              response: {
                text: () => `
### AI Evaluation 📊
Your score is good.

### Top Recommendation 💡
* **Reduce Energy:** Turn off standby.

### Next Challenge 🏆
* **No-Car Tuesday:** Commute via transit.
`
              }
            };
          },
          startChat: () => {
            return {
              sendMessage: async () => {
                return {
                  response: {
                    text: () => "Mocked Gemini text response."
                  }
                };
              }
            };
          }
        };
      }
    }
  };
});

describe("AI Coach Service Tests", () => {
  const mockAssessment: CarbonAssessment = {
    id: "test-assessment-id",
    userId: "test-user-id",
    transportKm: 30,
    transportType: "car_petrol",
    electricityBill: 120,
    electricityKwh: 0,
    foodHabits: "high_meat",
    shoppingHabits: "average",
    wasteHabits: "recycle_some",
    transportEmissions: 1862,
    energyEmissions: 3648,
    foodEmissions: 2800,
    shoppingEmissions: 1200,
    wasteEmissions: 300,
    monthlyFootprint: 818,
    annualFootprint: 9810,
    carbonScore: 51,
    createdAt: new Date(),
  };

  beforeEach(() => {
    process.env.GEMINI_API_KEY = "mock-api-key";
  });

  describe("Coaching Queries", () => {
    it("should return assessment prompt if no assessment is provided", async () => {
      const response = await generateCoachingResponse("How do I save carbon?", null);
      expect(response).toContain("assessment wizard first");
    });

    it("should return Gemini response if GEMINI_API_KEY is configured", async () => {
      const response = await generateCoachingResponse("Tell me about transit emissions", mockAssessment);
      expect(response).toBe("Mocked Gemini text response.");
    });

    it("should fallback to local heuristic if GEMINI_API_KEY is missing", async () => {
      delete process.env.GEMINI_API_KEY;
      const response = await generateCoachingResponse("How do I reduce driving?", mockAssessment);
      expect(response).toContain("Transportation Assessment");
      expect(response).toContain("petrol or diesel car");
    });

    it("should handle alternative transport types in local fallback", async () => {
      delete process.env.GEMINI_API_KEY;
      const evAssessment = { ...mockAssessment, transportType: "car_electric", transportEmissions: 150 };
      const resEv = await generateCoachingResponse("drive my car", evAssessment);
      expect(resEv).toContain("electric car");

      const transitAssessment = { ...mockAssessment, transportType: "public_transit", transportEmissions: 200 };
      const resTransit = await generateCoachingResponse("commuting via public transit", transitAssessment);
      expect(resTransit).toContain("public transit");
    });

    it("should fallback to diet heuristic", async () => {
      delete process.env.GEMINI_API_KEY;
      const response = await generateCoachingResponse("What is best to eat?", mockAssessment);
      expect(response).toContain("Sustainable Eating Advice");
      expect(response).toContain("meat-inclusive diet");
    });

    it("should handle alternative diets in local fallback", async () => {
      delete process.env.GEMINI_API_KEY;
      const veggieAssessment = { ...mockAssessment, foodHabits: "vegetarian", foodEmissions: 800 };
      const res = await generateCoachingResponse("eating food", veggieAssessment);
      expect(res).toContain("food emissions are low");
    });

    it("should fallback to energy heuristic", async () => {
      delete process.env.GEMINI_API_KEY;
      const response = await generateCoachingResponse("electricity bill optimization", mockAssessment);
      expect(response).toContain("Energy Conservation Coaching");
      expect(response).toContain("Solar Panels");
    });

    it("should fallback to waste heuristic", async () => {
      delete process.env.GEMINI_API_KEY;
      const response = await generateCoachingResponse("recycling plastic compost", mockAssessment);
      expect(response).toContain("Waste & Recycling Assessment");
      expect(response).toContain("Composting");

      const recycleAllAssessment = { ...mockAssessment, wasteHabits: "recycle_all", wasteEmissions: 100 };
      const resAll = await generateCoachingResponse("compost sorting trash", recycleAllAssessment);
      expect(resAll).toContain("recycle and compost regularly");
    });

    it("should fallback to general helper queries", async () => {
      delete process.env.GEMINI_API_KEY;
      const response = await generateCoachingResponse("general greeting question help", mockAssessment);
      expect(response).toContain("Top Personalized Actions");
    });
  });

  describe("Weekly Evaluation Report Generation", () => {
    it("should return template from Gemini when API key is active", async () => {
      const report = await generateEvaluationReport(mockAssessment, 1, 2, 3);
      expect(report).toContain("### AI Evaluation");
      expect(report).toContain("Top Recommendation");
    });

    it("should return local heuristic report if API key is absent", async () => {
      delete process.env.GEMINI_API_KEY;
      const report = await generateEvaluationReport(mockAssessment, 1, 2, 3);
      expect(report).toContain("### AI Evaluation");
      expect(report).toContain("Reduce Home Energy");
    });

    it("should customize local evaluation message based on score ranges", async () => {
      delete process.env.GEMINI_API_KEY;
      const highAssessment = { ...mockAssessment, carbonScore: 90 };
      const reportHigh = await generateEvaluationReport(highAssessment, 1, 2, 3);
      expect(reportHigh).toContain("Excellent work");

      const lowAssessment = { ...mockAssessment, carbonScore: 30 };
      const reportLow = await generateEvaluationReport(lowAssessment, 1, 2, 3);
      expect(reportLow).toContain("above average");
    });

    it("should return alert if no assessment exists for report", async () => {
      const report = await generateEvaluationReport(null, 0, 0, 0);
      expect(report).toContain("No carbon assessment found");
    });
  });

  describe("Regex Parser Fallback", () => {
    it("should extract variables correctly from text input using heuristics", async () => {
      delete process.env.GEMINI_API_KEY;
      const input = "I drive 45 km per day in my electric vehicle, eat a vegan diet, and my electricity bill is $95.";
      const parsed = await parseAssessmentFromText(input);
      expect(parsed.transportKm).toBe(45);
      expect(parsed.transportType).toBe("car_electric");
      expect(parsed.foodHabits).toBe("vegan");
      expect(parsed.electricityBill).toBe(95);
    });

    it("should support alternative types of transportation and habits in parser fallback", async () => {
      delete process.env.GEMINI_API_KEY;
      const input1 = "I drive a diesel car, eat a vegetarian meal, recycle compost, and have a monthly bill of 150$.";
      const parsed1 = await parseAssessmentFromText(input1);
      expect(parsed1.transportType).toBe("car_diesel");
      expect(parsed1.foodHabits).toBe("vegetarian");
      expect(parsed1.wasteHabits).toBe("recycle_all");
      expect(parsed1.electricityBill).toBe(150);

      const input2 = "I commute via transit metro public, eat a beef heavy red meat diet, do no recycling, and have a heavy shopping pattern.";
      const parsed2 = await parseAssessmentFromText(input2);
      expect(parsed2.transportType).toBe("public_transit");
      expect(parsed2.foodHabits).toBe("high_meat");
      expect(parsed2.wasteHabits).toBe("no_recycling");
      expect(parsed2.shoppingHabits).toBe("heavy");

      const input3 = "I walk or cycle active to school, shop less and minimal, and my bill is 120 dollars.";
      const parsed3 = await parseAssessmentFromText(input3);
      expect(parsed3.transportType).toBe("none");
      expect(parsed3.shoppingHabits).toBe("minimal");
      expect(parsed3.electricityBill).toBe(120);
    });
  });

  describe("Dynamic Challenges & Recommendations", () => {
    it("should generate dynamic challenges with Gemini API key", async () => {
      const challenges = await generateDynamicChallenges(mockAssessment);
      expect(challenges.length).toBe(2);
      expect(challenges[0].code).toContain("ai-");
    });

    it("should generate fallback challenges without Gemini API key", async () => {
      delete process.env.GEMINI_API_KEY;
      const challenges = await generateDynamicChallenges(mockAssessment);
      expect(challenges.length).toBe(2);
      expect(challenges[0].code).toContain("ai-");
    });

    it("should return empty array if no assessment exists for challenges", async () => {
      const challenges = await generateDynamicChallenges(null);
      expect(challenges).toEqual([]);
    });

    it("should generate recommendations with Gemini API key", async () => {
      const recommendations = await generateDynamicRecommendations(mockAssessment);
      expect(recommendations.length).toBe(3);
    });

    it("should generate fallback recommendations without Gemini API key", async () => {
      delete process.env.GEMINI_API_KEY;
      const recommendations = await generateDynamicRecommendations(mockAssessment);
      expect(recommendations.length).toBe(3);
    });

    it("should return empty array if no assessment exists for recommendations", async () => {
      const recommendations = await generateDynamicRecommendations(null);
      expect(recommendations).toEqual([]);
    });
  });

  describe("Simulator Optimizations", () => {
    it("should return target variables", async () => {
      const target = await generateSimulatorOptimization(mockAssessment);
      expect(target).toHaveProperty("targetTransportKm");
      expect(target).toHaveProperty("targetFoodHabits");
    });

    it("should return null if no assessment exists for optimization", async () => {
      const target = await generateSimulatorOptimization(null);
      expect(target).toBeNull();
    });
  });
});
