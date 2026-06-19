import { AssessmentInput } from "@/types";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "@/lib/logger";

function cleanJson(str: string): string {
  return str.replace(/```json/i, "").replace(/```/g, "").trim();
}

/**
 * Parses free-form text input into structured carbon assessment options.
 * Utilizes Gemini if configured, otherwise falls back to local regex matching heuristics.
 * 
 * @param text - The user's lifestyle description.
 * @returns A promise resolving to the parsed carbon assessment inputs.
 */
export async function parseAssessmentFromText(text: string): Promise<AssessmentInput> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `
You are CarbonWise, an AI sustainability parser. Analyze the user's lifestyle description:
"${text}"

Extract the following variables:
1. "transportKm": (number) daily commute distance in km. Default to 25 if unspecified.
2. "transportType": one of "car_petrol", "car_diesel", "car_electric", "public_transit", "none". Default to "car_petrol" if unspecified.
3. "electricityBill": (number) monthly electricity bill in dollars. Default to 80 if unspecified.
4. "foodHabits": one of "high_meat", "low_meat", "vegetarian", "vegan". Default to "low_meat" if unspecified.
5. "shoppingHabits": one of "minimal", "average", "heavy". Default to "average" if unspecified.
6. "wasteHabits": one of "recycle_all", "recycle_some", "no_recycling". Default to "recycle_some" if unspecified.

Return ONLY a valid JSON object containing these keys. Do not include markdown code block syntax. Return only raw JSON.
`;
      const result = await model.generateContent(prompt);
      const resText = result.response.text();
      if (resText) {
        return JSON.parse(cleanJson(resText));
      }
    } catch (e) {
      logger.error("Gemini parse assessment error", e);
    }
  }

  // --- LOCAL REGEX FALLBACK ENGINE ---
  const textLower = text.toLowerCase();
  let transportKm = 25;
  let transportType = "car_petrol";
  let electricityBill = 80;
  let foodHabits = "low_meat";
  let shoppingHabits = "average";
  let wasteHabits = "recycle_some";

  const kmMatch = textLower.match(/(\d+)\s*km/);
  if (kmMatch) transportKm = Number(kmMatch[1]);

  if (textLower.includes("electric") || textLower.includes("ev")) transportType = "car_electric";
  else if (textLower.includes("diesel")) transportType = "car_diesel";
  else if (textLower.includes("bus") || textLower.includes("train") || textLower.includes("transit") || textLower.includes("metro") || textLower.includes("public")) transportType = "public_transit";
  else if (textLower.includes("walk") || textLower.includes("cycle") || textLower.includes("bike") || textLower.includes("active") || textLower.includes("foot")) transportType = "none";

  const billMatch = textLower.match(/\$(\d+)/) || textLower.match(/(\d+)\s*\$/) || textLower.match(/bill\s+(?:is\s+)?(\d+)/);
  if (billMatch) electricityBill = Number(billMatch[1]);

  if (textLower.includes("vegan")) foodHabits = "vegan";
  else if (textLower.includes("vegetarian") || textLower.includes("veggie")) foodHabits = "vegetarian";
  else if (textLower.includes("heavy meat") || textLower.includes("beef") || textLower.includes("pork") || textLower.includes("red meat") || textLower.includes("high meat")) foodHabits = "high_meat";

  if (textLower.includes("minimal") || textLower.includes("secondhand") || textLower.includes("shop less")) shoppingHabits = "minimal";
  else if (textLower.includes("heavy") || textLower.includes("frequent") || textLower.includes("buy a lot")) shoppingHabits = "heavy";

  if (textLower.includes("compost") || textLower.includes("recycle all") || textLower.includes("zero waste")) wasteHabits = "recycle_all";
  else if (textLower.includes("no recycling") || textLower.includes("throw away") || textLower.includes("landfill")) wasteHabits = "no_recycling";

  return { transportKm, transportType, electricityBill, foodHabits, shoppingHabits, wasteHabits };
}
