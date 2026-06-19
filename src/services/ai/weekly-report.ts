import { CarbonAssessment } from "@/types";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "@/lib/logger";

/**
 * Generates an evaluation report based on the user's Carbon Assessment and activity metrics.
 * 
 * @param assessment - The user's latest Carbon Assessment data, or null.
 * @param activeGoalsCount - The count of user's active goals.
 * @param completedGoalsCount - The count of user's completed goals.
 * @param completedChallengesCount - The count of user's completed challenges.
 * @returns A promise resolving to the evaluation report markdown text.
 */
export async function generateEvaluationReport(
  assessment: CarbonAssessment | null,
  activeGoalsCount: number,
  completedGoalsCount: number,
  completedChallengesCount: number
): Promise<string> {
  if (!assessment) {
    return "### Evaluation Report 📊\n\nNo carbon assessment found. Please complete the footprint calculator first to receive your personalized evaluation report!";
  }

  const {
    transportKm,
    transportType,
    electricityBill,
    foodHabits,
    shoppingHabits,
    wasteHabits,
    transportEmissions,
    energyEmissions,
    foodEmissions,
    shoppingEmissions,
    wasteEmissions,
    annualFootprint,
    carbonScore,
  } = assessment;

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const reportPrompt = `
You are CarbonWise, a sustainability advisor. Generate a highly personalized Sustainability Evaluation Report for a user based on their assessment metrics:
- Overall Score: ${carbonScore}/100
- Annual Footprint: ${Math.round(annualFootprint)} kg CO2e
- Transportation: ${Math.round(transportEmissions)} kg (travels ${transportKm} km/day on ${transportType})
- Energy/Electricity: ${Math.round(energyEmissions)} kg (monthly bill: $${electricityBill})
- Diet/Food: ${Math.round(foodEmissions)} kg (${foodHabits})
- Shopping: ${Math.round(shoppingEmissions)} kg (${shoppingHabits})
- Waste/Recycling: ${Math.round(wasteEmissions)} kg (${wasteHabits})
- Goal Progress: ${completedGoalsCount} completed, ${activeGoalsCount} active goals
- Challenges Progress: ${completedChallengesCount} weekly challenges completed

Guidelines:
1. Provide a brief 2-sentence summary evaluating their score of ${carbonScore}/100.
2. Recommend exactly 1 high-impact action to set as a goal based on their highest emission source.
3. Suggest a weekly challenge theme (e.g. no-car, vegetarian, energy-saving) they should try next.
4. Format the response strictly using the following Markdown template, keeping the text concise (maximum 150 words total):

### AI Evaluation 📊
[2-sentence custom evaluation based on footprint metrics]

### Top Recommendation 💡
* **[Action Name]:** [Brief action summary and expected reduction impact]

### Next Challenge 🏆
* **[Challenge Title]:** [Brief description of challenge to join next]
`;

      const result = await model.generateContent(reportPrompt);
      const text = result.response.text();
      if (text) return text.trim();
    } catch (e) {
      logger.error("Gemini API Evaluation Report error", e);
    }
  }

  // --- LOCAL HEURISTIC REPORT ENGINE ---
  const categories = [
    { name: "Transportation", value: transportEmissions, action: "Try public transit or active commuting 2x a week to save up to 40% transit carbon.", challenge: "No-Car Tuesday" },
    { name: "Home Energy", value: energyEmissions, action: "Switch to LED lighting and adjust AC/heating by 1°C (2°F) to save 150 kg carbon.", challenge: "Energy Saver Week" },
    { name: "Diet & Food", value: foodEmissions, action: "Eliminate red meat 2-3 days a week. Going vegetarian reduces food emissions by 40%.", challenge: "Plant-Based Weekend" },
    { name: "Shopping", value: shoppingEmissions, action: "Practice conscious consumption: choose secondhand goods and repair rather than buy new.", challenge: "Zero Waste Week" },
  ];
  categories.sort((a, b) => b.value - a.value);
  const highest = categories[0];

  let evalText = `Your sustainability score is **${carbonScore}/100**. `;
  if (carbonScore > 80) {
    evalText += "Excellent work! You are a green leader with high carbon efficiency.";
  } else if (carbonScore > 50) {
    evalText += "Good progress, but you have significant room to reduce emissions further.";
  } else {
    evalText += "Your footprint is above average. Prioritizing reduction actions will make a huge impact.";
  }

  return `### AI Evaluation 📊
${evalText} You have completed **${completedGoalsCount}** goals and **${completedChallengesCount}** challenges.

### Top Recommendation 💡
* **Reduce ${highest.name}**: ${highest.action}

### Next Challenge 🏆
* **${highest.challenge}**: Join this weekly challenge in your Challenges panel to earn XP points!`;
}
