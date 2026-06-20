import { vi, describe, it, expect, beforeEach } from "vitest";
import { userRepository } from "@/repositories/user.repository";
import { assessmentRepository } from "@/repositories/assessment.repository";
import { goalRepository } from "@/repositories/goal.repository";
import { challengeRepository } from "@/repositories/challenge.repository";
import { reportRepository } from "@/repositories/report.repository";
import * as firestore from "firebase/firestore";

// Mock isFirebaseConfigured to be true!
vi.mock("@/lib/firebase", () => ({
  isFirebaseConfigured: true,
  db: { type: "mocked-db" },
}));

// Mock firestore methods
vi.mock("firebase/firestore", () => {
  const mockDocSnap = {
    exists: () => true,
    id: "mock-doc-id",
    data: () => ({
      userId: "test-user-123",
      name: "Firebase User",
      email: "firebase@user.com",
      points: 100,
      level: 1,
      createdAt: { toDate: () => new Date("2026-06-19T00:00:00.000Z") },
      carbonScore: 85,
      title: "Firebase Goal",
      category: "transport",
      co2Reduction: 100,
      difficulty: "easy",
      status: "JOINED",
      joinedAt: { toDate: () => new Date("2026-06-19T00:00:00.000Z") },
      carbonReduction: 200,
      topAccomplishment: "Recycled all week",
      missedOpportunities: "Left lights on",
      recommendedActions: "Install LEDs",
      scoreTrend: "Improving",
    }),
  };

  const mockQuerySnap = {
    empty: false,
    docs: [mockDocSnap],
    forEach: (callback: (doc: { exists: () => boolean; id: string; data: () => Record<string, unknown> }) => void) => callback(mockDocSnap),
  };

  return {
    doc: vi.fn().mockReturnValue({ ref: "doc-ref" }),
    getDoc: vi.fn().mockResolvedValue(mockDocSnap),
    setDoc: vi.fn().mockResolvedValue(undefined),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    collection: vi.fn().mockReturnValue({ ref: "col-ref" }),
    getDocs: vi.fn().mockResolvedValue(mockQuerySnap),
    query: vi.fn().mockReturnValue({ ref: "query-ref" }),
    where: vi.fn().mockReturnValue({ ref: "where-ref" }),
    addDoc: vi.fn().mockResolvedValue({ id: "new-doc-id" }),
    Timestamp: {
      now: vi.fn().mockReturnValue({ toDate: () => new Date() }),
    },
    writeBatch: vi.fn().mockReturnValue({
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    }),
  };
});

describe("Repository Layer Tests (Firebase Path)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("User Repository", () => {
    it("should fetch user profile from firestore", async () => {
      const res = await userRepository.getUserProfile("test-user-123");
      expect(res).toBeDefined();
      expect(res?.name).toBe("Firebase User");
      expect(firestore.getDoc).toHaveBeenCalled();
    });

    it("should create user profile in firestore", async () => {
      const res = await userRepository.createUserProfile("test-user-123", {
        name: "Firebase User",
        email: "firebase@user.com",
      });
      expect(res.name).toBe("Firebase User");
      expect(firestore.setDoc).toHaveBeenCalled();
    });

    it("should fetch user by email from firestore", async () => {
      const res = await userRepository.getUserByEmail("firebase@user.com");
      expect(res).toBeDefined();
      expect(res?.email).toBe("firebase@user.com");
      expect(firestore.getDocs).toHaveBeenCalled();
    });

    it("should update user points in firestore", async () => {
      const res = await userRepository.updateUserPoints("test-user-123", 250, 2);
      expect(res.points).toBe(250);
      expect(res.level).toBe(2);
      expect(firestore.updateDoc).toHaveBeenCalled();
    });

    it("should get user achievements from firestore", async () => {
      const res = await userRepository.getUserAchievements("test-user-123");
      expect(res).toHaveLength(1);
      expect(res[0].userId).toBe("test-user-123");
      expect(firestore.getDocs).toHaveBeenCalled();
    });

    it("should add achievement to firestore", async () => {
      // Mock existing check to return empty snap first
      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        empty: true,
        docs: [],
        forEach: () => {},
      } as unknown as firestore.QuerySnapshot);

      const res = await userRepository.addAchievement(
        "test-user-123",
        "Pioneer",
        "First step",
        "compass"
      );
      expect(res.id).toBe("new-doc-id");
      expect(firestore.addDoc).toHaveBeenCalled();
    });

    it("should return existing achievement if already unlocked in firestore", async () => {
      // Mock existing check to return non-empty
      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            exists: () => true,
            id: "existing-ach-id",
            data: () => ({ title: "Pioneer" }),
          },
        ],
        forEach: (cb: (doc: { exists: () => boolean; id: string; data: () => { title: string } }) => void) => cb({ exists: () => true, id: "existing-ach-id", data: () => ({ title: "Pioneer" }) }),
      } as unknown as firestore.QuerySnapshot);

      const res = await userRepository.addAchievement(
        "test-user-123",
        "Pioneer",
        "First step",
        "compass"
      );
      expect(res.id).toBe("existing-ach-id");
    });
  });

  describe("Assessment Repository", () => {
    it("should get latest assessment from firestore", async () => {
      const res = await assessmentRepository.getLatestAssessment("test-user-123");
      expect(res).toBeDefined();
      expect(res?.carbonScore).toBe(85);
      expect(firestore.getDocs).toHaveBeenCalled();
    });

    it("should get assessment history from firestore", async () => {
      const res = await assessmentRepository.getAssessmentsHistory("test-user-123");
      expect(res).toHaveLength(1);
      expect(firestore.getDocs).toHaveBeenCalled();
    });

    it("should save assessment in firestore", async () => {
      const res = await assessmentRepository.saveAssessment("test-user-123", {
        transportKm: 10,
        transportType: "ev",
        electricityBill: 100,
        electricityKwh: 200,
        foodHabits: "vegan",
        shoppingHabits: "low",
        wasteHabits: "recycle",
        transportEmissions: 10,
        energyEmissions: 10,
        foodEmissions: 10,
        shoppingEmissions: 10,
        wasteEmissions: 10,
        monthlyFootprint: 50,
        annualFootprint: 600,
        carbonScore: 90,
      });
      expect(res.id).toBe("new-doc-id");
      expect(firestore.addDoc).toHaveBeenCalled();
    });

    it("should delete assessments in firestore", async () => {
      await assessmentRepository.deleteAssessments("test-user-123");
      expect(firestore.writeBatch).toHaveBeenCalled();
    });
  });

  describe("Goal Repository", () => {
    it("should get user goals from firestore", async () => {
      const res = await goalRepository.getUserGoals("test-user-123");
      expect(res).toHaveLength(1);
      expect(firestore.getDocs).toHaveBeenCalled();
    });

    it("should add goal in firestore", async () => {
      const res = await goalRepository.addGoal("test-user-123", {
        title: "Test Goal",
        category: "transport",
        co2Reduction: 50,
        difficulty: "easy",
      });
      expect(res.id).toBe("new-doc-id");
      expect(firestore.addDoc).toHaveBeenCalled();
    });

    it("should update goal in firestore", async () => {
      const res = await goalRepository.updateGoal("test-user-123", "goal-1", "COMPLETED");
      expect(res).toBeDefined();
      expect(firestore.updateDoc).toHaveBeenCalled();
      expect(firestore.getDoc).toHaveBeenCalled();
    });

    it("should return null if goal is not found in firestore on update", async () => {
      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => false,
        id: "goal-1",
        data: () => ({}),
      } as unknown as firestore.DocumentSnapshot);

      const res = await goalRepository.updateGoal("test-user-123", "goal-1", "COMPLETED");
      expect(res).toBeNull();
    });
  });

  describe("Challenge Repository", () => {
    it("should get user challenges from firestore", async () => {
      const res = await challengeRepository.getUserChallenges("test-user-123");
      expect(res).toHaveLength(1);
      expect(firestore.getDocs).toHaveBeenCalled();
    });

    it("should join challenge in firestore", async () => {
      const res = await challengeRepository.joinChallenge("test-user-123", "no-car");
      expect(res.id).toBe("new-doc-id");
      expect(firestore.addDoc).toHaveBeenCalled();
    });

    it("should complete challenge in firestore", async () => {
      const res = await challengeRepository.completeChallenge("test-user-123", "enrollment-1");
      expect(res).toBeDefined();
      expect(firestore.updateDoc).toHaveBeenCalled();
    });
  });

  describe("Report Repository", () => {
    it("should get weekly reports from firestore", async () => {
      const res = await reportRepository.getWeeklyReports("test-user-123");
      expect(res).toHaveLength(1);
      expect(firestore.getDocs).toHaveBeenCalled();
    });

    it("should get weekly report by id from firestore", async () => {
      const res = await reportRepository.getWeeklyReportById("test-user-123", "report-1");
      expect(res).toBeDefined();
      expect(res?.userId).toBe("test-user-123");
      expect(firestore.getDoc).toHaveBeenCalled();
    });

    it("should return null if weekly report has different user id in firestore", async () => {
      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: "mock-doc-id",
        data: () => ({
          userId: "other-user",
        }),
      } as unknown as firestore.DocumentSnapshot);

      const res = await reportRepository.getWeeklyReportById("test-user-123", "report-1");
      expect(res).toBeNull();
    });

    it("should save weekly report in firestore", async () => {
      const res = await reportRepository.saveWeeklyReport("test-user-123", {
        carbonReduction: 100,
        topAccomplishment: "Accomplished",
        missedOpportunities: "Missed",
        recommendedActions: "Actions",
        scoreTrend: "Trend",
      });
      expect(res.id).toBe("new-doc-id");
      expect(firestore.addDoc).toHaveBeenCalled();
    });
  });
});
