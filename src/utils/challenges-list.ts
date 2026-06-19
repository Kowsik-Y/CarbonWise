import { Challenge } from "@/types";

export const WEEKLY_CHALLENGES: Challenge[] = [
  {
    code: "no-car-tuesday",
    title: "No-Car Tuesday",
    description: "Leave your car at home on Tuesday. Walk, run, cycle, or take public transit for all travel.",
    category: "transport",
    points: 80,
    duration: "1 day",
    difficulty: "medium",
  },
  {
    code: "plant-based-weekend",
    title: "Plant-Based Weekend",
    description: "Eat 100% vegetarian or vegan meals (no meat or fish) throughout Saturday and Sunday.",
    category: "food",
    points: 120,
    duration: "2 days",
    difficulty: "medium",
  },
  {
    code: "energy-saver-week",
    title: "Energy Saver Week",
    description: "Unplug idle appliances, switch off unused lights, run appliances only with full loads, and lower thermostat/AC usage.",
    category: "energy",
    points: 200,
    duration: "7 days",
    difficulty: "hard",
  },
  {
    code: "digital-detox-sunday",
    title: "Digital Detox Sunday",
    description: "Power down non-essential devices (TV, consoles, tablets) for the day to save standby energy and reconnect with nature.",
    category: "energy",
    points: 100,
    duration: "1 day",
    difficulty: "easy",
  },
  {
    code: "zero-waste-week",
    title: "Zero Plastic Week",
    description: "Avoid buying or using single-use plastic items (bags, bottles, straws, cups) for a full week.",
    category: "waste",
    points: 250,
    duration: "7 days",
    difficulty: "hard",
  },
];
