import { CarbonAssessment } from "@/types";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "@/lib/logger";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Generates an AI-powered or heuristic coaching response based on the user's Carbon Assessment and chat history.
 * 
 * @param query - The user's input/question.
 * @param assessment - The user's latest Carbon Assessment data, or null.
 * @param history - The chat messages history array.
 * @returns A promise resolving to the coaching response markdown text.
 */
export async function generateCoachingResponse(
  query: string,
  assessment: CarbonAssessment | null,
  history: ChatMessage[] = []
): Promise<string> {
  const queryLower = query.toLowerCase();

  // If no assessment exists, prompt them to complete it
  if (!assessment) {
    return "It looks like you haven't completed your Carbon Assessment yet. 📊 Please complete the assessment wizard first so I can learn about your lifestyle and give you personalized, data-backed reduction recommendations!";
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

  // Check if live API is available
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);

      // Convert standard ChatMessage logs history to Google AI SDK format (user -> "user", assistant -> "model").
      // The Gemini SDK requires the first message in chat history to be from the 'user' role.
      // We skip any leading 'model' messages from the history array to prevent validation crashes.
      const historyContents = [];
      let foundUser = false;
      for (const msg of history) {
        if (msg.role === "user") {
          foundUser = true;
        }
        if (foundUser) {
          historyContents.push({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }],
          });
        }
      }

      const systemInstruction = `You are CarbonWise, a staff sustainability expert and empathetic personal sustainability coach.
The user has completed a carbon assessment with these details:
- Overall Sustainability Score: ${carbonScore}/100 (where 100 is excellent, 0 is poor)
- Total Annual Footprint: ${Math.round(annualFootprint)} kg CO2e (${(annualFootprint / 1000).toFixed(1)} tonnes)
- Category Breakdown:
  * Transportation: ${Math.round(transportEmissions)} kg CO2e/year (travels ${transportKm} km/day using ${transportType})
  * Electricity/Energy: ${Math.round(energyEmissions)} kg CO2e/year (monthly bill: $${electricityBill})
  * Food/Diet: ${Math.round(foodEmissions)} kg CO2e/year (diet type: ${foodHabits})
  * Shopping/Consumption: ${Math.round(shoppingEmissions)} kg CO2e/year (shopping level: ${shoppingHabits})
  * Waste/Recycling: ${Math.round(wasteEmissions)} kg CO2e/year (recycling habits: ${wasteHabits})

Guidelines:
1. Be encouraging, positive, and practical. Use a helpful coaching tone.
2. Refer to the user's specific carbon metrics where relevant (e.g., if they ask about travel, cite their travel emissions of ${Math.round(transportEmissions)} kg).
3. Keep the response concise, engaging, and structured with bullet points.
4. Give actionable recommendations and include potential carbon savings.`;

      const chatModel = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: systemInstruction,
      });

      // Start a native chat session with assessment context and messages history
      const chat = chatModel.startChat({
        history: historyContents,
      });

      const result = await chat.sendMessage(query);
      const text = result.response.text();
      if (text) {
        return text.trim();
      }
      logger.warn("Gemini API call returned empty response, falling back to local heuristic coach.");
    } catch (e) {
      logger.error("Gemini API SDK error", e);
    }
  }

  // --- LOCAL HEURISTIC COACH ENGINE ---
  // Calculates percentage contributions
  const total = annualFootprint || 1;
  const pTrans = Math.round((transportEmissions / total) * 100);
  const pEnergy = Math.round((energyEmissions / total) * 100);
  const pFood = Math.round((foodEmissions / total) * 100);
  const pShop = Math.round((shoppingEmissions / total) * 100);
  const pWaste = Math.round((wasteEmissions / total) * 100);

  // Find biggest contributor
  const categories = [
    { name: "Transportation", value: transportEmissions, pct: pTrans },
    { name: "Energy & Electricity", value: energyEmissions, pct: pEnergy },
    { name: "Diet & Food", value: foodEmissions, pct: pFood },
    { name: "Shopping & Goods", value: shoppingEmissions, pct: pShop },
    { name: "Waste & Landfill", value: wasteEmissions, pct: pWaste },
  ];
  categories.sort((a, b) => b.value - a.value);
  const biggest = categories[0];
  const second = categories[1];

  // 1. Query: Transport / Travel / Car / Driving / Flight
  if (
    queryLower.includes("drive") ||
    queryLower.includes("driving") ||
    queryLower.includes("car") ||
    queryLower.includes("transit") ||
    queryLower.includes("travel") ||
    queryLower.includes("transport") ||
    queryLower.includes("flight") ||
    queryLower.includes("plane")
  ) {
    let advice = `### Transportation Assessment 🚗\n\n`;
    advice += `Your transportation habits emit **${Math.round(
      transportEmissions
    )} kg CO₂e** annually, which represents **${pTrans}%** of your footprint.\n\n`;

    if (transportType === "car_petrol" || transportType === "car_diesel") {
      advice += `Since you commute **${transportKm} km/day** using a petrol or diesel car, it is a key reduction target. Here are three steps you can take:\n`;
      advice += `* **Public Transit:** Commuting via bus or train just 2 days a week could save around **${Math.round(
        transportEmissions * 0.4
      )} kg CO₂e** a year.\n`;
      advice += `* **Carpooling/Active Transit:** Cycling or carpooling with colleagues lowers your direct emissions immediately.\n`;
      advice += `* **EV Transition:** Switching to an electric vehicle would drop your transit emissions from ${Math.round(
        transportEmissions
      )} kg to just **${Math.round(transportKm * 365 * 0.05)} kg CO₂e** per year!`;
    } else if (transportType === "car_electric") {
      advice += `Great job driving an electric car! Your transit footprint is relatively low (**${Math.round(
        transportEmissions
      )} kg**). Keep using clean charging sources where possible to further reduce grid carbon impact.`;
    } else {
      advice += `You commute **${transportKm} km/day** via public transit or active means. This is excellent! Public transit emits only ~0.03 kg CO2e/km, making your travel highly sustainable.`;
    }

    return advice;
  }

  // 2. Query: Diet / Meat / Beef / Chicken / Food / Eat / Vegetarian / Vegan
  if (
    queryLower.includes("diet") ||
    queryLower.includes("food") ||
    queryLower.includes("eat") ||
    queryLower.includes("meat") ||
    queryLower.includes("beef") ||
    queryLower.includes("chicken") ||
    queryLower.includes("vegetarian") ||
    queryLower.includes("vegan")
  ) {
    let advice = `### Sustainable Eating Advice 🍽️\n\n`;
    advice += `Your diet contributes **${Math.round(
      foodEmissions
    )} kg CO₂e** annually (**${pFood}%** of your total footprint).\n\n`;

    if (foodHabits === "high_meat" || foodHabits === "low_meat") {
      advice += `You've indicated a meat-inclusive diet. Animal agriculture, especially red meat (beef, lamb), is highly carbon-intensive:\n`;
      advice += `* **Beef vs. Chicken:** Beef emissions (~27 kg CO₂/kg) are 4x higher than chicken (~6.9 kg CO₂/kg). Shifting beef meals to poultry saves significant carbon.\n`;
      advice += `* **Meatless Mondays:** Eliminating meat just 1 day a week will reduce your annual diet emissions by **${Math.round(
        foodEmissions * 0.14
      )} kg CO₂e**!\n`;
      advice += `* **Plant-Based transition:** Going vegetarian or vegan can shrink your food footprint by **40% to 70%** (saving up to **${Math.round(
        foodEmissions - 600
      )} kg CO₂e** annually).`;
    } else {
      advice += `As a ${foodHabits}, your food emissions are low at **${foodEmissions} kg CO₂e/year**. This is one of the most effective lifestyle choices for the planet! To optimize further, try to minimize food waste and purchase locally grown, seasonal produce.`;
    }

    return advice;
  }

  // 3. Query: Electricity / Energy / Bill / Heating / Solar / Power
  if (
    queryLower.includes("energy") ||
    queryLower.includes("electricity") ||
    queryLower.includes("bill") ||
    queryLower.includes("solar") ||
    queryLower.includes("led") ||
    queryLower.includes("power")
  ) {
    let advice = `### Energy Conservation Coaching ⚡\n\n`;
    advice += `Your home energy use accounts for **${Math.round(
      energyEmissions
    )} kg CO₂e** annually (**${pEnergy}%** of your footprint).\n\n`;

    advice += `Here are the highest impact ways to cut electricity usage:\n`;
    advice += `* **Switch to LEDs:** Replacing traditional bulbs with LEDs reduces lighting electricity usage by 75%.\n`;
    advice += `* **Thermostat Adjustment:** Adjusting your AC/heating by just 1°C (2°F) can decrease your energy bill and emissions by **5-8%**.\n`;
    advice += `* **Phantom Loads:** Unplugging chargers and devices on standby saves average households about 100 kg CO₂e a year.\n`;
    if (electricityBill > 100) {
      advice += `* **Solar Panels:** Given your moderate-to-high electricity bill ($${electricityBill}/month), home solar panels could offset up to 100% of your energy footprint!`;
    }

    return advice;
  }

  // 4. Query: Recycle / Waste / Compost / Plastic
  if (
    queryLower.includes("recycle") ||
    queryLower.includes("waste") ||
    queryLower.includes("compost") ||
    queryLower.includes("plastic") ||
    queryLower.includes("landfill")
  ) {
    let advice = `### Waste & Recycling Assessment ♻️\n\n`;
    advice += `Waste management represents **${Math.round(
      wasteEmissions
    )} kg CO₂e** annually (**${pWaste}%** of your total footprint).\n\n`;

    if (wasteHabits === "no_recycling" || wasteHabits === "recycle_some") {
      advice += `Improving waste habits has a environmental payoff beyond carbon (reducing ocean plastics and methane landfill leaks):\n`;
      advice += `* **Composting:** Methane emissions from organic waste in landfills are highly potent. Composting food scraps cuts this to near zero.\n`;
      advice += `* **Rigorous Recycling:** Separating paper, glass, aluminum, and plastics reduces manufacturing carbon footprint.\n`;
      advice += `* **Refuse Single-Use:** Carry reusable shopping bags, coffee cups, and water bottles to eliminate plastic waste.`;
    } else {
      advice += `You recycle and compost regularly! Your waste footprint is at a minimum (**100 kg CO₂e**). Focus on avoiding single-use plastics and packaging entirely to reach zero-waste.`;
    }

    return advice;
  }

  // 5. Query: General "How do I reduce my footprint?" or greetings
  let advice = `Hello! I'm your AI Sustainability Coach. 🌲\n\n`;
  advice += `Your overall **Sustainability Score is ${carbonScore}/100** with an annual footprint of **${(
    annualFootprint / 1000
  ).toFixed(1)} tonnes CO₂e**.\n\n`;
  advice += `Based on your profile, your biggest emission contributor is **${biggest.name}** at **${biggest.pct}%**, followed by **${second.name}** at **${second.pct}%**.\n\n`;
  advice += `### Your Top Personalized Actions:\n`;

  if (biggest.name.includes("Transport")) {
    advice += `1. **Transit Shift:** Try walking or taking transit for trips under 5km. This directly targets your highest emission source.\n`;
  } else if (biggest.name.includes("Energy")) {
    advice += `1. **Smart Climate:** Lower your heating or raise your AC thermostat slightly to reduce residential power loads.\n`;
  } else if (biggest.name.includes("Diet")) {
    advice += `1. **Flexitarian Diet:** Try eating vegetarian just 2-3 days a week. It dramatically cuts methane and land-use carbon.\n`;
  } else {
    advice += `1. **Conscious Consumption:** Reduce buying new products. Opt for secondhand items and repair rather than replace.\n`;
  }

  if (second.name.includes("Transport")) {
    advice += `2. **Vehicle Efficiency:** Check tyre pressure and maintain smooth acceleration. Better yet, try carpooling.\n`;
  } else if (second.name.includes("Energy")) {
    advice += `2. **Vampire Power:** Turn off power strips and electronics when sleeping to cut standby loads.\n`;
  } else if (second.name.includes("Diet")) {
    advice += `2. **Switch Red Meat:** Replace beef or lamb with poultry or fish, which have a fraction of the carbon footprint.\n`;
  } else {
    advice += `2. **Composting:** Compost food scraps to prevent them from rotting in landfills and releasing methane.\n`;
  }

  advice += `\nYou can add these goals in your **Goals** panel to track your progress and earn points! What specific category would you like to explore further?`;
  return advice;
}
