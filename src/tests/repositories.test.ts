import { vi, describe, it, expect, beforeEach } from "vitest";
import { userRepository } from "@/repositories/user.repository";
import { User, CarbonAssessment, Goal, UserChallenge, Achievement, WeeklyReport } from "@prisma/client";
import { assessmentRepository } from "@/repositories/assessment.repository";
import { goalRepository } from "@/repositories/goal.repository";
import { challengeRepository } from "@/repositories/challenge.repository";
import { reportRepository } from "@/repositories/report.repository";
import { prisma } from "@/lib/db";

// Mock database dependencies
vi.mock("@/lib/firebase", () => ({
  isFirebaseConfigured: false,
  db: null,
}));

vi.mock("@/lib/db", () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      carbonAssessment: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        deleteMany: vi.fn(),
      },
      goal: {
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      userChallenge: {
        findMany: vi.fn(),
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      achievement: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      weeklyReport: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    },
  };
});

describe("Repository Layer Tests (SQLite Fallback)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("User Repository", () => {
    it("should fetch user profile", async () => {
      const mockUser = { id: "u1", name: "Eco Hero", email: "hero@eco.com", points: 50, level: 1 };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as unknown as User);

      const res = await userRepository.getUserProfile("u1");
      expect(res).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "u1" },
        select: expect.any(Object),
      });
    });

    it("should return null if user profile is not found", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      const res = await userRepository.getUserProfile("missing");
      expect(res).toBeNull();
    });

    it("should fetch user by email", async () => {
      const mockUser = { id: "u1", email: "hero@eco.com" };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as unknown as User);
      const res = await userRepository.getUserByEmail("hero@eco.com");
      expect(res).toEqual(mockUser);
    });

    it("should return null if user not found by email", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      const res = await userRepository.getUserByEmail("missing@eco.com");
      expect(res).toBeNull();
    });

    it("should create user profile", async () => {
      const mockUser = { id: "u1", name: "Eco Hero", email: "hero@eco.com", points: 0, level: 1 };
      vi.mocked(prisma.user.create).mockResolvedValue(mockUser as unknown as User);

      const res = await userRepository.createUserProfile("u1", { name: "Eco Hero", email: "hero@eco.com" });
      expect(res).toEqual(mockUser);
    });

    it("should create local user credentials", async () => {
      const mockUser = { id: "u1", name: "Eco Hero", email: "hero@eco.com", points: 0, level: 1 };
      vi.mocked(prisma.user.create).mockResolvedValue(mockUser as unknown as User);

      const res = await userRepository.createUser({ name: "Eco Hero", email: "hero@eco.com", passwordHash: "hash" });
      expect(res).toEqual(mockUser);
    });

    it("should update user points", async () => {
      vi.mocked(prisma.user.update).mockResolvedValue({ points: 200, level: 2 } as unknown as User);

      const res = await userRepository.updateUserPoints("u1", 200, 2);
      expect(res).toEqual({ points: 200, level: 2 });
    });

    it("should get user achievements", async () => {
      const achievements = [{ id: "a1", userId: "u1", title: "Carbon Pioneer" }];
      vi.mocked(prisma.achievement.findMany).mockResolvedValue(achievements as unknown as Achievement[]);

      const res = await userRepository.getUserAchievements("u1");
      expect(res).toEqual(achievements);
    });

    it("should add achievement if not exists", async () => {
      const mockAchievement = { id: "a1", title: "Eco King" };
      vi.mocked(prisma.achievement.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.achievement.create).mockResolvedValue(mockAchievement as unknown as Achievement);

      const res = await userRepository.addAchievement("u1", "Eco King", "Desc", "icon");
      expect(res).toEqual(mockAchievement);
    });

    it("should return existing achievement if already exists", async () => {
      const mockAchievement = { id: "a1", title: "Eco King" };
      vi.mocked(prisma.achievement.findFirst).mockResolvedValue(mockAchievement as unknown as Achievement);

      const res = await userRepository.addAchievement("u1", "Eco King", "Desc", "icon");
      expect(res).toEqual(mockAchievement);
    });
  });

  describe("Assessment Repository", () => {
    it("should get latest assessment", async () => {
      const mockAssessment = { id: "ass1", userId: "u1", carbonScore: 90 };
      vi.mocked(prisma.carbonAssessment.findFirst).mockResolvedValue(mockAssessment as unknown as CarbonAssessment);

      const res = await assessmentRepository.getLatestAssessment("u1");
      expect(res).toEqual(mockAssessment);
    });

    it("should return null if no latest assessment exists", async () => {
      vi.mocked(prisma.carbonAssessment.findFirst).mockResolvedValue(null);
      const res = await assessmentRepository.getLatestAssessment("u1");
      expect(res).toBeNull();
    });

    it("should get history of assessments", async () => {
      const mockHistory = [{ id: "ass1" }, { id: "ass2" }];
      vi.mocked(prisma.carbonAssessment.findMany).mockResolvedValue(mockHistory as unknown as CarbonAssessment[]);

      const res = await assessmentRepository.getAssessmentsHistory("u1");
      expect(res).toEqual(mockHistory);
    });

    it("should save assessment", async () => {
      const mockAssessment = { id: "ass1", userId: "u1", carbonScore: 90 };
      vi.mocked(prisma.carbonAssessment.create).mockResolvedValue(mockAssessment as unknown as CarbonAssessment);

      const res = await assessmentRepository.saveAssessment("u1", {
        transportKm: 10,
        transportType: "car_petrol",
        electricityBill: 80,
        electricityKwh: 100,
        foodHabits: "vegetarian",
        shoppingHabits: "average",
        wasteHabits: "recycle_some",
        transportEmissions: 1000,
        energyEmissions: 1200,
        foodEmissions: 800,
        shoppingEmissions: 400,
        wasteEmissions: 200,
        monthlyFootprint: 300,
        annualFootprint: 3600,
        carbonScore: 90,
      });
      expect(res).toEqual(mockAssessment);
    });

    it("should delete assessments", async () => {
      vi.mocked(prisma.carbonAssessment.deleteMany).mockResolvedValue({ count: 2 });
      await assessmentRepository.deleteAssessments("u1");
      expect(prisma.carbonAssessment.deleteMany).toHaveBeenCalledWith({
        where: { userId: "u1" },
      });
    });
  });

  describe("Goal Repository", () => {
    it("should get user goals", async () => {
      const goals = [{ id: "g1", title: "Cycle to work" }];
      vi.mocked(prisma.goal.findMany).mockResolvedValue(goals as unknown as Goal[]);

      const res = await goalRepository.getUserGoals("u1");
      expect(res).toEqual(goals);
    });

    it("should add a goal", async () => {
      const newGoal = { id: "g1", title: "Cycle" };
      vi.mocked(prisma.goal.create).mockResolvedValue(newGoal as unknown as Goal);

      const res = await goalRepository.addGoal("u1", {
        title: "Cycle",
        category: "transport",
        co2Reduction: 200,
        difficulty: "medium",
      });
      expect(res).toEqual(newGoal);
    });

    it("should update a goal", async () => {
      const updatedGoal = { id: "g1", title: "Cycle", status: "COMPLETED" };
      vi.mocked(prisma.goal.update).mockResolvedValue(updatedGoal as unknown as Goal);

      const res = await goalRepository.updateGoal("u1", "g1", "COMPLETED");
      expect(res).toEqual(updatedGoal);
    });
  });

  describe("Challenge Repository", () => {
    it("should join challenge", async () => {
      const enrollment = { id: "ch1", challengeCode: "no-car" };
      vi.mocked(prisma.userChallenge.create).mockResolvedValue(enrollment as unknown as UserChallenge);

      const res = await challengeRepository.joinChallenge("u1", "no-car");
      expect(res).toEqual(enrollment);
    });

    it("should get user challenges", async () => {
      const mockChallenges = [{ id: "ch1", challengeCode: "no-car", status: "JOINED" }];
      vi.mocked(prisma.userChallenge.findMany).mockResolvedValue(mockChallenges as unknown as UserChallenge[]);

      const res = await challengeRepository.getUserChallenges("u1");
      expect(res).toEqual(mockChallenges);
    });

    it("should complete challenge", async () => {
      const enrollment = { id: "ch1", challengeCode: "no-car", status: "JOINED" };
      const completed = { id: "ch1", challengeCode: "no-car", status: "COMPLETED" };
      vi.mocked(prisma.userChallenge.findFirst).mockResolvedValue(enrollment as unknown as UserChallenge);
      vi.mocked(prisma.userChallenge.update).mockResolvedValue(completed as unknown as UserChallenge);

      const res = await challengeRepository.completeChallenge("u1", "ch1");
      expect(res).toEqual(completed);
    });

    it("should throw if completing non-existent or already completed challenge", async () => {
      vi.mocked(prisma.userChallenge.findFirst).mockResolvedValue(null);
      await expect(challengeRepository.completeChallenge("u1", "ch1")).rejects.toThrow("Challenge enrollment not found or already completed");
    });
  });

  describe("Report Repository", () => {
    it("should save weekly report", async () => {
      const report = { id: "rep1", carbonReduction: 300 };
      vi.mocked(prisma.weeklyReport.create).mockResolvedValue(report as unknown as WeeklyReport);

      const res = await reportRepository.saveWeeklyReport("u1", {
        carbonReduction: 300,
        topAccomplishment: "Eco Champion",
        missedOpportunities: "Utilities",
        recommendedActions: "LED bulbs",
        scoreTrend: "Stable",
      });
      expect(res).toEqual(report);
    });

    it("should get weekly reports", async () => {
      const mockReports = [{ id: "rep1", userId: "u1" }];
      vi.mocked(prisma.weeklyReport.findMany).mockResolvedValue(mockReports as unknown as WeeklyReport[]);

      const res = await reportRepository.getWeeklyReports("u1");
      expect(res).toEqual(mockReports);
    });

    it("should get weekly report by id", async () => {
      const mockReport = { id: "rep1", userId: "u1" };
      vi.mocked(prisma.weeklyReport.findUnique).mockResolvedValue(mockReport as unknown as WeeklyReport);

      const res = await reportRepository.getWeeklyReportById("u1", "rep1");
      expect(res).toEqual(mockReport);
    });

    it("should return null if weekly report has different user id or not found", async () => {
      vi.mocked(prisma.weeklyReport.findUnique).mockResolvedValue(null);
      const res1 = await reportRepository.getWeeklyReportById("u1", "rep1");
      expect(res1).toBeNull();

      vi.mocked(prisma.weeklyReport.findUnique).mockResolvedValue({ id: "rep1", userId: "other" } as unknown as WeeklyReport);
      const res2 = await reportRepository.getWeeklyReportById("u1", "rep1");
      expect(res2).toBeNull();
    });
  });
});
