import { CarbonAssessment, AssessmentInput, Challenge, AIRecommendation, SimulatorOptimization } from "@/types";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "@/lib/logger";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

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
      advice += `As a ${foodHabits}, your food emissions are low at **${foodEmissions} kg CO₂e/year**. This is one of the most effective lifestyle choices for the planet! To optimize further, try to minimize food waste and purchase locally flex-1 grown, seasonal produce.`;
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
      advice += `Improving waste habits has a high environmental payoff beyond carbon (reducing ocean plastics and methane landfill leaks):\n`;
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

function cleanJson(str: string): string {
  return str.replace(/```json/i, "").replace(/```/g, "").trim();
}

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

export async function generateDynamicChallenges(assessment: CarbonAssessment | null): Promise<Challenge[]> {
  if (!assessment) return [];

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
    carbonScore
  } = assessment;

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `
You are CarbonWise, a sustainability advisor. Generate 2 highly personalized weekly challenges for a user based on their carbon assessment metrics:
- Overall Score: ${carbonScore}/100
- Annual Footprint: ${Math.round(annualFootprint)} kg CO2e
- Transportation: ${Math.round(transportEmissions)} kg (travels ${transportKm} km/day on ${transportType})
- Energy/Electricity: ${Math.round(energyEmissions)} kg (monthly bill: $${electricityBill})
- Diet/Food: ${Math.round(foodEmissions)} kg (${foodHabits})
- Shopping: ${Math.round(shoppingEmissions)} kg (${shoppingHabits})
- Waste/Recycling: ${Math.round(wasteEmissions)} kg (${wasteHabits})

Guidelines:
1. One challenge must address their highest emission source.
2. The other challenge must address their second highest source.
3. Keep them realistic and actionable.
4. Return ONLY a valid JSON array containing objects with these exact keys:
   - "code": a unique string slug starting with "ai-" (e.g. "ai-bike-to-work")
   - "title": short, catchy challenge name
   - "description": exactly what the user needs to do
   - "category": one of "transport", "energy", "food", "shopping", "waste"
   - "points": integer between 50 and 300 depending on difficulty
   - "duration": text (e.g. "3 days", "7 days", "1 day")
   - "difficulty": "easy", "medium", or "hard"

Do not include any wrapping markdown formatting (like \`\`\`json) or extra text. Return ONLY raw JSON.
`;
      const result = await model.generateContent(prompt);
      const resText = result.response.text();
      if (resText) {
        return JSON.parse(cleanJson(resText));
      }
    } catch (e) {
      logger.error("Gemini dynamic challenges error", e);
    }
  }

  // --- LOCAL FALLBACK DYNAMIC CHALLENGES ---
  const categories: Array<{
    name: "transport" | "energy" | "food" | "shopping" | "waste";
    value: number;
    code: string;
    title: string;
    desc: string;
    points: number;
    duration: string;
    difficulty: "easy" | "medium" | "hard";
  }> = [
    { name: "transport", value: transportEmissions, code: "ai-transit-shift", title: "Transit Shift Week", desc: "Shift 3 commute trips this week from driving to public transit, cycling, or walking.", points: 150, duration: "7 days", difficulty: "medium" },
    { name: "energy", value: energyEmissions, code: "ai-unplug-standby", title: "Unplug Vampire Loads", desc: "Unplug all screen displays, game consoles, and chargers on standby at night for 5 days.", points: 100, duration: "5 days", difficulty: "easy" },
    { name: "food", value: foodEmissions, code: "ai-plant-based-week", title: "Plant-Based Weekdays", desc: "Commit to eating 100% vegetarian meals from Monday to Friday.", points: 180, duration: "5 days", difficulty: "medium" },
    { name: "shopping", value: shoppingEmissions, code: "ai-no-buy-week", title: "No-New Shopping Week", desc: "Do not buy any clothing, gadgets, or new home accessories for 7 days.", points: 200, duration: "7 days", difficulty: "hard" },
  ];
  categories.sort((a, b) => b.value - a.value);

  return [
    {
      code: categories[0].code,
      title: categories[0].title,
      description: categories[0].desc,
      category: categories[0].name,
      points: categories[0].points,
      duration: categories[0].duration,
      difficulty: categories[0].difficulty,
    },
    {
      code: categories[1].code,
      title: categories[1].title,
      description: categories[1].desc,
      category: categories[1].name,
      points: categories[1].points,
      duration: categories[1].duration,
      difficulty: categories[1].difficulty,
    }
  ];
}

export async function generateDynamicRecommendations(assessment: CarbonAssessment | null): Promise<AIRecommendation[]> {
  if (!assessment) return [];

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
    wasteEmissions
  } = assessment;

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `
You are CarbonWise, a sustainability advisor. Generate 3 custom recommended action goals for the user based on their assessment:
- Transportation: ${transportEmissions} kg (${transportKm} km/day on ${transportType})
- Energy/Electricity: ${energyEmissions} kg (monthly bill: $${electricityBill})
- Diet/Food: ${foodEmissions} kg (${foodHabits})
- Shopping: ${shoppingEmissions} kg (${shoppingHabits})
- Waste/Recycling: ${wasteEmissions} kg (${wasteHabits})

Return ONLY a JSON array containing exactly 3 objects with keys:
- "title": short, active task description (e.g. "Swap beef for poultry")
- "category": "transport", "energy", "food", "shopping", "waste"
- "co2": expected annual reduction in kg CO2 (e.g. 180)
- "diff": "easy", "medium", or "hard"

Do not include markdown code block syntax. Return only raw JSON.
`;
      const result = await model.generateContent(prompt);
      const resText = result.response.text();
      if (resText) {
        return JSON.parse(cleanJson(resText));
      }
    } catch (e) {
      logger.error("Gemini dynamic recommendations error", e);
    }
  }

  // --- LOCAL FALLBACK RECOMMENDATIONS ---
  const allRecs: Array<{
    title: string;
    category: "transport" | "energy" | "food" | "shopping" | "waste";
    co2: number;
    diff: "easy" | "medium" | "hard";
    priority: number;
  }> = [
    { title: "Carpool or ride transit 2 days/week", category: "transport", co2: 380, diff: "medium", priority: transportEmissions },
    { title: "Switch home lightbulbs to LEDs", category: "energy", co2: 120, diff: "easy", priority: energyEmissions },
    { title: "Implement Meatless Mondays", category: "food", co2: 150, diff: "easy", priority: foodEmissions },
    { title: "Unplug standby vampire electronics", category: "energy", co2: 80, diff: "easy", priority: energyEmissions * 0.5 },
    { title: "Compost kitchen food scraps", category: "waste", co2: 140, diff: "medium", priority: wasteEmissions },
    { title: "Reduce clothing shopping by 50%", category: "shopping", co2: 600, diff: "hard", priority: shoppingEmissions },
  ];
  allRecs.sort((a, b) => b.priority - a.priority);

  return allRecs.slice(0, 3).map(({ title, category, co2, diff }) => ({ title, category, co2, diff }));
}

export async function generateSimulatorOptimization(assessment: CarbonAssessment | null): Promise<SimulatorOptimization | null> {
  if (!assessment) return null;

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
    wasteEmissions
  } = assessment;

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `
You are CarbonWise, a sustainability planner. Suggest the single most optimal simulation setup for a user based on their carbon assessment:
- Transportation: ${transportEmissions} kg (${transportKm} km/day on ${transportType})
- Energy/Electricity: ${energyEmissions} kg (monthly bill: $${electricityBill})
- Diet/Food: ${foodEmissions} kg (${foodHabits})
- Shopping: ${shoppingEmissions} kg (${shoppingHabits})
- Waste/Recycling: ${wasteEmissions} kg (${wasteHabits})

Recommend target values to achieve significant reduction with minimal friction. Return ONLY a JSON object:
{
  "targetTransportKm": number,
  "targetTransportType": string ("car_petrol", "car_diesel", "car_electric", "public_transit", "none"),
  "targetElectricityBill": number,
  "targetFoodHabits": string ("high_meat", "low_meat", "vegetarian", "vegan"),
  "targetShoppingHabits": string ("minimal", "average", "heavy"),
  "targetWasteHabits": string ("recycle_all", "recycle_some", "no_recycling")
}
Do not include markdown code block syntax. Return only raw JSON.
`;
      const result = await model.generateContent(prompt);
      const resText = result.response.text();
      if (resText) {
        return JSON.parse(cleanJson(resText));
      }
    } catch (e) {
      logger.error("Gemini simulator optimization error", e);
    }
  }

  // --- LOCAL FALLBACK SIMULATOR OPTIMIZER ---
  const targetTransportKm = Math.max(0, Math.round(transportKm * 0.6));
  const targetTransportType = transportType === "car_petrol" || transportType === "car_diesel" ? "public_transit" : transportType;
  const targetElectricityBill = Math.max(0, Math.round(electricityBill * 0.7));
  const targetFoodHabits = foodHabits === "high_meat" ? "low_meat" : foodHabits === "low_meat" ? "vegetarian" : "vegan";
  const targetShoppingHabits = shoppingHabits === "heavy" ? "average" : "minimal";
  const targetWasteHabits = wasteHabits === "no_recycling" ? "recycle_some" : "recycle_all";

  return {
    targetTransportKm,
    targetTransportType,
    targetElectricityBill,
    targetFoodHabits,
    targetShoppingHabits,
    targetWasteHabits
  };
}
