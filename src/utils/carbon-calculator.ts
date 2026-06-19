// Carbon Emission Factors (kg CO2e per unit)
export const EMISSION_FACTORS = {
  // Transport: kg CO2e per km
  transport: {
    car_petrol: 0.17,
    car_diesel: 0.16,
    car_electric: 0.05,
    public_transit: 0.03,
    none: 0.0,
  },
  // Electricity: kg CO2e per kWh
  electricityKwh: 0.38,
  // Diet: kg CO2e per year
  diet: {
    vegan: 600,
    vegetarian: 1000,
    low_meat: 1600,
    high_meat: 2800,
  },
  // Shopping: kg CO2e per year
  shopping: {
    minimal: 400,
    average: 1200,
    heavy: 3000,
  },
  // Waste: kg CO2e per year
  waste: {
    recycle_all: 100,
    recycle_some: 300,
    no_recycling: 600,
  },
};

// Average cost of electricity per kWh for conversion if not known (USD per kWh)
export const ELECTRICITY_COST_PER_KWH = 0.15;

export interface CalculationInput {
  transportKm: number;
  transportType: string;
  electricityBill: number;
  electricityKwh: number;
  foodHabits: string;
  shoppingHabits: string;
  wasteHabits: string;
}

export interface CalculationOutput {
  transportEmissions: number;
  energyEmissions: number;
  foodEmissions: number;
  shoppingEmissions: number;
  wasteEmissions: number;
  monthlyFootprint: number;
  annualFootprint: number;
  carbonScore: number;
}

export function calculateCarbonFootprint(input: CalculationInput): CalculationOutput {
  const {
    transportKm,
    transportType,
    electricityBill,
    electricityKwh,
    foodHabits,
    shoppingHabits,
    wasteHabits,
  } = input;

  // 1. Transportation emissions (annualized)
  const transportFactor =
    EMISSION_FACTORS.transport[transportType as keyof typeof EMISSION_FACTORS.transport] ||
    EMISSION_FACTORS.transport.none;
  const transportEmissions = transportKm * 365 * transportFactor;

  // 2. Energy emissions (annualized)
  let kwh = electricityKwh;
  if (kwh <= 0 && electricityBill > 0) {
    kwh = electricityBill / ELECTRICITY_COST_PER_KWH;
  }
  const energyEmissions = kwh * 12 * EMISSION_FACTORS.electricityKwh;

  // 3. Diet emissions (annualized)
  const foodEmissions =
    EMISSION_FACTORS.diet[foodHabits as keyof typeof EMISSION_FACTORS.diet] ||
    EMISSION_FACTORS.diet.low_meat;

  // 4. Shopping emissions (annualized)
  const shoppingEmissions =
    EMISSION_FACTORS.shopping[shoppingHabits as keyof typeof EMISSION_FACTORS.shopping] ||
    EMISSION_FACTORS.shopping.average;

  // 5. Waste emissions (annualized)
  const wasteEmissions =
    EMISSION_FACTORS.waste[wasteHabits as keyof typeof EMISSION_FACTORS.waste] ||
    EMISSION_FACTORS.waste.recycle_some;

  // Total annual emissions (kg CO2e)
  const annualFootprint =
    transportEmissions +
    energyEmissions +
    foodEmissions +
    shoppingEmissions +
    wasteEmissions;

  // Total monthly emissions
  const monthlyFootprint = annualFootprint / 12;

  // Carbon Score: 100 is excellent, 0 is poor
  // Standard target is under 2,000 kg/year (2 tonnes). Average US footprint is ~16 tonnes (16,000 kg).
  // A simple scale: score 100 for 0 emissions, decreasing to 10 for 18,000+ emissions.
  const baseScore = 100 - (annualFootprint / 200);
  const carbonScore = Math.max(10, Math.min(100, Math.round(baseScore)));

  return {
    transportEmissions: Math.round(transportEmissions),
    energyEmissions: Math.round(energyEmissions),
    foodEmissions: Math.round(foodEmissions),
    shoppingEmissions: Math.round(shoppingEmissions),
    wasteEmissions: Math.round(wasteEmissions),
    monthlyFootprint: Math.round(monthlyFootprint),
    annualFootprint: Math.round(annualFootprint),
    carbonScore,
  };
}

// Convert carbon kg into tangible comparisons
export function getCarbonEquivalents(kgCO2: number) {
  return {
    treesPlanted: Math.round(kgCO2 / 22), // 1 mature tree absorbs ~22kg CO2 per year
    flightsSaved: Math.round(kgCO2 / 250), // 1 hour of flight is ~250kg CO2
    carMilesAvoided: Math.round(kgCO2 / 0.4), // average car emits ~400g/mile
  };
}
