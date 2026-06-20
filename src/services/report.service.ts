import { reportRepository } from "@/repositories/report.repository";
import { assessmentRepository } from "@/repositories/assessment.repository";
import { goalRepository } from "@/repositories/goal.repository";
import { challengeRepository } from "@/repositories/challenge.repository";
import { WeeklyReport } from "@/types";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "@/lib/logger";

export class ReportService {
  /**
   * Retrieves all weekly reports generated for a user.
   * 
   * @param userId - Unique identifier of the user.
   * @returns A list of WeeklyReports.
   */
  async getWeeklyReports(userId: string): Promise<WeeklyReport[]> {
    return reportRepository.getWeeklyReports(userId);
  }

  /**
   * Retrieves a weekly report by its ID and validates owner.
   * 
   * @param userId - Unique identifier of the user.
   * @param reportId - Unique identifier of the report.
   * @returns The WeeklyReport or null.
   */
  async getWeeklyReportById(userId: string, reportId: string): Promise<WeeklyReport | null> {
    return reportRepository.getWeeklyReportById(userId, reportId);
  }

  /**
   * Generates a weekly sustainability progress report for a user.
   * Pulls metrics on assessment trends, completed goals and challenges.
   * Utilizes Gemini AI model to write copy, falling back to local heuristic text if key is absent.
   * 
   * @param userId - Unique identifier of the user.
   * @returns A promise resolving to the saved WeeklyReport.
   */
  async generateWeeklyReport(userId: string): Promise<WeeklyReport> {
    // 1. Fetch latest assessment and history
    const latestAssessment = await assessmentRepository.getLatestAssessment(userId);
    const assessmentHistory = await assessmentRepository.getAssessmentsHistory(userId);
    
    // 2. Fetch goals and challenges
    const goalsList = await goalRepository.getUserGoals(userId);
    const challengesList = await challengeRepository.getUserChallenges(userId);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Calculate completed items in the last 7 days
    const completedGoals = goalsList.filter((g) => {
      if (g.status !== "COMPLETED" || !g.completedAt) return false;
      const completedDate = new Date(g.completedAt);
      return completedDate >= sevenDaysAgo;
    });

    const completedChallenges = challengesList.filter((c) => {
      if (c.status !== "COMPLETED" || !c.completedAt) return false;
      const completedDate = new Date(c.completedAt);
      return completedDate >= sevenDaysAgo;
    });

    // 3. Calculate carbon reduction achieved (kg CO2e)
    // Goals define their co2Reduction. Completed challenges award a flat 100 kg reduction estimate.
    let carbonReduction = completedGoals.reduce((sum, g) => sum + g.co2Reduction, 0);
    carbonReduction += completedChallenges.length * 100;

    // 4. Calculate score trend
    let scoreTrend = "Stable";
    if (assessmentHistory.length >= 2) {
      const latest = assessmentHistory[assessmentHistory.length - 1].carbonScore;
      const prev = assessmentHistory[assessmentHistory.length - 2].carbonScore;
      const diff = latest - prev;
      if (diff > 0) {
        scoreTrend = `Improved (+${diff} pts)`;
      } else if (diff < 0) {
        scoreTrend = `Decreased (${diff} pts)`;
      } else {
        scoreTrend = "Stable (0 change)";
      }
    } else if (latestAssessment) {
      scoreTrend = `Initialized at ${latestAssessment.carbonScore} pts`;
    }

    // 5. Generate text content (Gemini AI or Heuristic Fallback)
    let topAccomplishment = "";
    let missedOpportunities = "";
    let recommendedActions = "";

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && latestAssessment) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
You are CarbonWise, a sustainability data analyst. Generate a concise weekly sustainability summary for a user:
- Carbon reduction achieved: ${carbonReduction} kg CO2e
- Sustainability score trend: ${scoreTrend}
- Carbon Assessment values: Transport (${latestAssessment.transportEmissions} kg), Energy (${latestAssessment.energyEmissions} kg), Food (${latestAssessment.foodEmissions} kg), Shopping (${latestAssessment.shoppingEmissions} kg), Waste (${latestAssessment.wasteEmissions} kg)
- Completed Goals (Last 7 Days): ${completedGoals.map(g => g.title).join(", ") || "None"}
- Completed Challenges (Last 7 Days): ${completedChallenges.map(c => c.challengeCode).join(", ") || "None"}

Please output exactly three sections:
- "topAccomplishment": A brief sentence summarizing their greatest action or maintaining consistency.
- "missedOpportunities": A constructive sentence pointing out areas with high emissions where no actions were taken this week.
- "recommendedActions": A brief list (max 2 items, comma-separated) of targeted actions they should do next week.

Return ONLY a valid JSON object with keys "topAccomplishment", "missedOpportunities", and "recommendedActions". Do not include markdown wraps like \`\`\`json.
`;
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (text) {
          const parsed = JSON.parse(text.replace(/```json/i, "").replace(/```/g, "").trim());
          topAccomplishment = parsed.topAccomplishment || "";
          missedOpportunities = parsed.missedOpportunities || "";
          recommendedActions = Array.isArray(parsed.recommendedActions) 
            ? parsed.recommendedActions.join(", ") 
            : parsed.recommendedActions || "";
        }
      } catch (e) {
        logger.error("Gemini Weekly Report Generation failed, using local fallback", e);
      }
    }

    // Heuristic fallback if Gemini failed or was not configured
    if (!topAccomplishment) {
      if (completedGoals.length > 0) {
        topAccomplishment = `Completed ${completedGoals.length} reduction goal(s) including "${completedGoals[0].title}", saving ${carbonReduction} kg CO2e!`;
      } else if (completedChallenges.length > 0) {
        topAccomplishment = `Completed weekly challenge "${completedChallenges[0].challengeCode.toUpperCase()}"!`;
      } else {
        topAccomplishment = "Maintained consistent lifestyle habits. Let's aim to complete a goal next week!";
      }
    }

    if (!missedOpportunities) {
      if (latestAssessment) {
        const categories = [
          { name: "transport", val: latestAssessment.transportEmissions, label: "Transportation" },
          { name: "energy", val: latestAssessment.energyEmissions, label: "Home Utilities" },
          { name: "food", val: latestAssessment.foodEmissions, label: "Diet & Food" },
          { name: "shopping", val: latestAssessment.shoppingEmissions, label: "Product Shopping" },
        ];
        categories.sort((a, b) => b.val - a.val);
        const primaryEmitter = categories[0];
        
        const hasGoalInPrimary = goalsList.some(g => g.category === primaryEmitter.name);
        if (!hasGoalInPrimary) {
          missedOpportunities = `${primaryEmitter.label} remains your largest source of emissions (${primaryEmitter.val} kg), but no active goals are targeting it.`;
        } else {
          missedOpportunities = "You did great tracking your goals, but home heating and vampire loads present additional untapped savings.";
        }
      } else {
        missedOpportunities = "Fill out a carbon assessment to discover key areas where you can reduce emissions.";
      }
    }

    if (!recommendedActions) {
      if (latestAssessment) {
        const actions = [];
        if (latestAssessment.transportType === "car_petrol" || latestAssessment.transportType === "car_diesel") {
          actions.push("Try taking public transit or carpooling twice a week");
        }
        if (latestAssessment.foodHabits === "high_meat" || latestAssessment.foodHabits === "low_meat") {
          actions.push("Implement Meatless Mondays");
        }
        if (latestAssessment.electricityBill > 80) {
          actions.push("Unplug vampire standby loads at night");
        }
        if (actions.length === 0) {
          actions.push("Compost organic food scraps", "Limit shopping new garments");
        }
        recommendedActions = actions.slice(0, 2).join(", ");
      } else {
        recommendedActions = "Complete a carbon assessment, Set a reduction goal";
      }
    }

    // 6. Save report using ReportRepository
    return reportRepository.saveWeeklyReport(userId, {
      carbonReduction,
      topAccomplishment,
      missedOpportunities,
      recommendedActions,
      scoreTrend
    });
  }
}

export const reportService = new ReportService();
