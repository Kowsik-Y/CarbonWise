export interface User {
  id: string;
  email: string;
  name: string;
  points: number;
  level: number;
  createdAt: Date | string;
}

export interface CarbonAssessment {
  id: string;
  userId: string;
  transportKm: number;
  transportType: string;
  electricityBill: number;
  electricityKwh: number;
  foodHabits: string;
  shoppingHabits: string;
  wasteHabits: string;
  
  // Calculated annual emissions (kg CO2e)
  transportEmissions: number;
  energyEmissions: number;
  foodEmissions: number;
  shoppingEmissions: number;
  wasteEmissions: number;
  
  monthlyFootprint: number;
  annualFootprint: number;
  carbonScore: number;
  createdAt: Date | string;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  category: "transport" | "energy" | "food" | "shopping" | "waste";
  co2Reduction: number;
  difficulty: "easy" | "medium" | "hard";
  status: "ACTIVE" | "COMPLETED";
  targetDate?: Date | string;
  completedAt?: Date | string;
  createdAt: Date | string;
}

export interface Challenge {
  code: string;
  title: string;
  description: string;
  category: "transport" | "energy" | "food" | "shopping" | "waste";
  points: number;
  duration: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface UserChallenge {
  id: string;
  userId: string;
  challengeCode: string;
  status: "JOINED" | "COMPLETED";
  joinedAt: Date | string;
  completedAt?: Date | string;
}

export interface Achievement {
  id: string;
  userId: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: Date | string;
}

export interface AuthSession {
  user: User | null;
  isLoading: boolean;
}
