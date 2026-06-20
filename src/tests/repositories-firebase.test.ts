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
    forEach: (callback: (doc: firestore.QueryDocumentSnapshot) => void) =>
      callback(mockDocSnap as unknown as firestore.QueryDocumentSnapshot),
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
    it("should fetch user profile from firestore (success)", async () => {
      const res = await userRepository.getUserProfile("test-user-123");
      expect(res).toBeDefined();
      expect(res?.name).toBe("Firebase User");
      expect(firestore.getDoc).toHaveBeenCalled();
    });

    it("should return null if user profile is not found in firestore", async () => {
      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => false,
        id: "test-user-123",
        data: () => undefined,
      } as unknown as firestore.DocumentSnapshot);

      const res = await userRepository.getUserProfile("test-user-123");
      expect(res).toBeNull();
    });

    it("should throw error if getDoc fails", async () => {
      vi.mocked(firestore.getDoc).mockRejectedValueOnce(new Error("Firestore Error"));
      await expect(userRepository.getUserProfile("test-user-123")).rejects.toThrow("Firestore Error");
    });

    it("should create user profile in firestore (success)", async () => {
      const res = await userRepository.createUserProfile("test-user-123", {
        name: "Firebase User",
        email: "firebase@user.com",
      });
      expect(res.name).toBe("Firebase User");
      expect(firestore.setDoc).toHaveBeenCalled();
    });

    it("should throw error if setDoc fails on create", async () => {
      vi.mocked(firestore.setDoc).mockRejectedValueOnce(new Error("Firestore Error"));
      await expect(userRepository.createUserProfile("test-user-123", {
        name: "Firebase User",
        email: "firebase@user.com",
      })).rejects.toThrow("Firestore Error");
    });

    it("should fetch user by email from firestore (success)", async () => {
      const res = await userRepository.getUserByEmail("firebase@user.com");
      expect(res).toBeDefined();
      expect(res?.email).toBe("firebase@user.com");
      expect(firestore.getDocs).toHaveBeenCalled();
    });

    it("should return null if user email is not found in firestore", async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        empty: true,
        docs: [],
        forEach: () => {},
      } as unknown as firestore.QuerySnapshot);
      const res = await userRepository.getUserByEmail("firebase@user.com");
      expect(res).toBeNull();
    });

    it("should throw error if getDocs fails on getUserByEmail", async () => {
      vi.mocked(firestore.getDocs).mockRejectedValueOnce(new Error("Firestore Error"));
      await expect(userRepository.getUserByEmail("firebase@user.com")).rejects.toThrow("Firestore Error");
    });

    it("should update user points in firestore (success)", async () => {
      const res = await userRepository.updateUserPoints("test-user-123", 250, 2);
      expect(res.points).toBe(250);
      expect(res.level).toBe(2);
      expect(firestore.updateDoc).toHaveBeenCalled();
    });

    it("should throw error if updateDoc fails on updateUserPoints", async () => {
      vi.mocked(firestore.updateDoc).mockRejectedValueOnce(new Error("Firestore Error"));
      await expect(userRepository.updateUserPoints("test-user-123", 250, 2)).rejects.toThrow("Firestore Error");
    });

    it("should get user achievements from firestore (success)", async () => {
      const res = await userRepository.getUserAchievements("test-user-123");
      expect(res).toHaveLength(1);
      expect(res[0].userId).toBe("test-user-123");
      expect(firestore.getDocs).toHaveBeenCalled();
    });

    it("should return empty list if user achievements are empty", async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        empty: true,
        docs: [],
        forEach: () => {},
      } as unknown as firestore.QuerySnapshot);
      const res = await userRepository.getUserAchievements("test-user-123");
      expect(res).toHaveLength(0);
    });

    it("should throw error if getDocs fails on getUserAchievements", async () => {
      vi.mocked(firestore.getDocs).mockRejectedValueOnce(new Error("Firestore Error"));
      await expect(userRepository.getUserAchievements("test-user-123")).rejects.toThrow("Firestore Error");
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
        forEach: (cb: (doc: firestore.QueryDocumentSnapshot) => void) =>
          cb({ exists: () => true, id: "existing-ach-id", data: () => ({ title: "Pioneer" }) } as unknown as firestore.QueryDocumentSnapshot),
      } as unknown as firestore.QuerySnapshot);

      const res = await userRepository.addAchievement(
        "test-user-123",
        "Pioneer",
        "First step",
        "compass"
      );
      expect(res.id).toBe("existing-ach-id");
    });

    it("should add achievement to firestore if not exists (success)", async () => {
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

    it("should throw error if addDoc fails in addAchievement", async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        empty: true,
        docs: [],
        forEach: () => {},
      } as unknown as firestore.QuerySnapshot);
      vi.mocked(firestore.addDoc).mockRejectedValueOnce(new Error("Firestore Error"));
      
      await expect(userRepository.addAchievement(
        "test-user-123",
        "Pioneer",
        "First step",
        "compass"
      )).rejects.toThrow("Firestore Error");
    });
  });

  describe("Assessment Repository", () => {
    it("should get latest assessment from firestore (success)", async () => {
      // Return two assessments to test sorting branch
      const mockDoc1 = {
        exists: () => true,
        id: "a1",
        data: () => ({ carbonScore: 70, createdAt: { toDate: () => new Date("2026-06-18T00:00:00.000Z") } }),
      };
      const mockDoc2 = {
        exists: () => true,
        id: "a2",
        data: () => ({ carbonScore: 90, createdAt: { toDate: () => new Date("2026-06-19T00:00:00.000Z") } }),
      };
      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [mockDoc1, mockDoc2],
        forEach: (cb: (doc: firestore.QueryDocumentSnapshot) => void) => {
          cb(mockDoc1 as unknown as firestore.QueryDocumentSnapshot);
          cb(mockDoc2 as unknown as firestore.QueryDocumentSnapshot);
        },
      } as unknown as firestore.QuerySnapshot);

      const res = await assessmentRepository.getLatestAssessment("test-user-123");
      expect(res).toBeDefined();
      expect(res?.id).toBe("a2"); // newest should be returned first due to b.createdAt - a.createdAt
      expect(res?.carbonScore).toBe(90);
    });

    it("should return null if latest assessment not found in firestore", async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        empty: true,
        docs: [],
        forEach: () => {},
      } as unknown as firestore.QuerySnapshot);

      const res = await assessmentRepository.getLatestAssessment("test-user-123");
      expect(res).toBeNull();
    });

    it("should throw error if getDocs fails on getLatestAssessment", async () => {
      vi.mocked(firestore.getDocs).mockRejectedValueOnce(new Error("Firestore Error"));
      await expect(assessmentRepository.getLatestAssessment("test-user-123")).rejects.toThrow("Firestore Error");
    });

    it("should get assessment history from firestore sorted ascending (success)", async () => {
      const mockDoc1 = {
        exists: () => true,
        id: "a1",
        data: () => ({ carbonScore: 70, createdAt: { toDate: () => new Date("2026-06-19T00:00:00.000Z") } }),
      };
      const mockDoc2 = {
        exists: () => true,
        id: "a2",
        data: () => ({ carbonScore: 90, createdAt: { toDate: () => new Date("2026-06-18T00:00:00.000Z") } }),
      };
      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [mockDoc1, mockDoc2],
        forEach: (cb: (doc: firestore.QueryDocumentSnapshot) => void) => {
          cb(mockDoc1 as unknown as firestore.QueryDocumentSnapshot);
          cb(mockDoc2 as unknown as firestore.QueryDocumentSnapshot);
        },
      } as unknown as firestore.QuerySnapshot);

      const res = await assessmentRepository.getAssessmentsHistory("test-user-123");
      expect(res).toHaveLength(2);
      expect(res[0].id).toBe("a2"); // oldest first due to a.createdAt - b.createdAt
      expect(res[1].id).toBe("a1");
    });

    it("should return empty list if history is empty", async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        empty: true,
        docs: [],
        forEach: () => {},
      } as unknown as firestore.QuerySnapshot);

      const res = await assessmentRepository.getAssessmentsHistory("test-user-123");
      expect(res).toHaveLength(0);
    });

    it("should throw error if getDocs fails on getAssessmentsHistory", async () => {
      vi.mocked(firestore.getDocs).mockRejectedValueOnce(new Error("Firestore Error"));
      await expect(assessmentRepository.getAssessmentsHistory("test-user-123")).rejects.toThrow("Firestore Error");
    });

    it("should save assessment in firestore (success)", async () => {
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

    it("should throw error if addDoc fails on saveAssessment", async () => {
      vi.mocked(firestore.addDoc).mockRejectedValueOnce(new Error("Firestore Error"));
      await expect(assessmentRepository.saveAssessment("test-user-123", {
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
      })).rejects.toThrow("Firestore Error");
    });

    it("should delete assessments in firestore (success)", async () => {
      const mockDoc1 = {
        exists: () => true,
        id: "a1",
        ref: { type: "ref1" },
        data: () => ({}),
      };
      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [mockDoc1],
        forEach: (cb: (doc: firestore.QueryDocumentSnapshot) => void) =>
          cb(mockDoc1 as unknown as firestore.QueryDocumentSnapshot),
      } as unknown as firestore.QuerySnapshot);

      await assessmentRepository.deleteAssessments("test-user-123");
      expect(firestore.writeBatch).toHaveBeenCalled();
    });

    it("should not call commit if no assessments to delete", async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        empty: true,
        docs: [],
        forEach: () => {},
      } as unknown as firestore.QuerySnapshot);
      
      const mockBatch = {
        delete: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(firestore.writeBatch).mockReturnValueOnce(mockBatch as unknown as firestore.WriteBatch);

      await assessmentRepository.deleteAssessments("test-user-123");
      expect(mockBatch.delete).not.toHaveBeenCalled();
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it("should throw error if getDocs fails on deleteAssessments", async () => {
      vi.mocked(firestore.getDocs).mockRejectedValueOnce(new Error("Firestore Error"));
      await expect(assessmentRepository.deleteAssessments("test-user-123")).rejects.toThrow("Firestore Error");
    });

    it("should throw error if batch commit fails on deleteAssessments", async () => {
      const mockDoc1 = {
        exists: () => true,
        id: "a1",
        ref: { type: "ref1" },
        data: () => ({}),
      };
      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [mockDoc1],
        forEach: (cb: (doc: firestore.QueryDocumentSnapshot) => void) =>
          cb(mockDoc1 as unknown as firestore.QueryDocumentSnapshot),
      } as unknown as firestore.QuerySnapshot);

      const mockBatch = {
        delete: vi.fn(),
        commit: vi.fn().mockRejectedValueOnce(new Error("Commit Failed")),
      };
      vi.mocked(firestore.writeBatch).mockReturnValueOnce(mockBatch as unknown as firestore.WriteBatch);

      await expect(assessmentRepository.deleteAssessments("test-user-123")).rejects.toThrow("Commit Failed");
    });
  });

  describe("Goal Repository", () => {
    it("should get user goals from firestore sorted descending (success)", async () => {
      const mockDoc1 = {
        exists: () => true,
        id: "g1",
        data: () => ({ title: "Goal 1", createdAt: { toDate: () => new Date("2026-06-18T00:00:00.000Z") } }),
      };
      const mockDoc2 = {
        exists: () => true,
        id: "g2",
        data: () => ({ title: "Goal 2", createdAt: { toDate: () => new Date("2026-06-19T00:00:00.000Z") } }),
      };
      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [mockDoc1, mockDoc2],
        forEach: (cb: (doc: firestore.QueryDocumentSnapshot) => void) => {
          cb(mockDoc1 as unknown as firestore.QueryDocumentSnapshot);
          cb(mockDoc2 as unknown as firestore.QueryDocumentSnapshot);
        },
      } as unknown as firestore.QuerySnapshot);

      const res = await goalRepository.getUserGoals("test-user-123");
      expect(res).toHaveLength(2);
      expect(res[0].id).toBe("g2"); // newest first
      expect(res[1].id).toBe("g1");
    });

    it("should return empty list if user goals are empty", async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        empty: true,
        docs: [],
        forEach: () => {},
      } as unknown as firestore.QuerySnapshot);

      const res = await goalRepository.getUserGoals("test-user-123");
      expect(res).toHaveLength(0);
    });

    it("should throw error if getDocs fails on getUserGoals", async () => {
      vi.mocked(firestore.getDocs).mockRejectedValueOnce(new Error("Firestore Error"));
      await expect(goalRepository.getUserGoals("test-user-123")).rejects.toThrow("Firestore Error");
    });

    it("should add goal in firestore (success)", async () => {
      const res = await goalRepository.addGoal("test-user-123", {
        title: "Test Goal",
        category: "transport",
        co2Reduction: 50,
        difficulty: "easy",
      });
      expect(res.id).toBe("new-doc-id");
      expect(firestore.addDoc).toHaveBeenCalled();
    });

    it("should throw error if addDoc fails on addGoal", async () => {
      vi.mocked(firestore.addDoc).mockRejectedValueOnce(new Error("Firestore Error"));
      await expect(goalRepository.addGoal("test-user-123", {
        title: "Test Goal",
        category: "transport",
        co2Reduction: 50,
        difficulty: "easy",
      })).rejects.toThrow("Firestore Error");
    });

    it("should update goal in firestore (COMPLETED status)", async () => {
      const mockDoc = {
        exists: () => true,
        id: "goal-1",
        data: () => ({ status: "COMPLETED", completedAt: { toDate: () => new Date() } }),
      };
      vi.mocked(firestore.getDoc).mockResolvedValueOnce(mockDoc as unknown as firestore.DocumentSnapshot);

      const res = await goalRepository.updateGoal("test-user-123", "goal-1", "COMPLETED");
      expect(res).toBeDefined();
      expect(res?.status).toBe("COMPLETED");
      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: "COMPLETED", completedAt: expect.any(Object) })
      );
    });

    it("should update goal in firestore (ACTIVE status)", async () => {
      const mockDoc = {
        exists: () => true,
        id: "goal-1",
        data: () => ({ status: "ACTIVE" }),
      };
      vi.mocked(firestore.getDoc).mockResolvedValueOnce(mockDoc as unknown as firestore.DocumentSnapshot);

      const res = await goalRepository.updateGoal("test-user-123", "goal-1", "ACTIVE");
      expect(res).toBeDefined();
      expect(res?.status).toBe("ACTIVE");
      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { status: "ACTIVE" }
      );
    });

    it("should return null if goal is not found in firestore on update", async () => {
      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => false,
        id: "goal-1",
        data: () => undefined,
      } as unknown as firestore.DocumentSnapshot);

      const res = await goalRepository.updateGoal("test-user-123", "goal-1", "COMPLETED");
      expect(res).toBeNull();
    });

    it("should throw error if updateDoc fails on updateGoal", async () => {
      vi.mocked(firestore.updateDoc).mockRejectedValueOnce(new Error("Firestore Error"));
      await expect(goalRepository.updateGoal("test-user-123", "goal-1", "COMPLETED")).rejects.toThrow("Firestore Error");
    });

    it("should throw error if getDoc fails on updateGoal", async () => {
      vi.mocked(firestore.getDoc).mockRejectedValueOnce(new Error("Firestore Error"));
      await expect(goalRepository.updateGoal("test-user-123", "goal-1", "COMPLETED")).rejects.toThrow("Firestore Error");
    });
  });

  describe("Challenge Repository", () => {
    it("should get user challenges from firestore (success)", async () => {
      const res = await challengeRepository.getUserChallenges("test-user-123");
      expect(res).toHaveLength(1);
      expect(firestore.getDocs).toHaveBeenCalled();
    });

    it("should return empty list if user challenges are empty", async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        empty: true,
        docs: [],
        forEach: () => {},
      } as unknown as firestore.QuerySnapshot);

      const res = await challengeRepository.getUserChallenges("test-user-123");
      expect(res).toHaveLength(0);
    });

    it("should throw error if getDocs fails on getUserChallenges", async () => {
      vi.mocked(firestore.getDocs).mockRejectedValueOnce(new Error("Firestore Error"));
      await expect(challengeRepository.getUserChallenges("test-user-123")).rejects.toThrow("Firestore Error");
    });

    it("should join challenge in firestore (success)", async () => {
      const res = await challengeRepository.joinChallenge("test-user-123", "no-car");
      expect(res.id).toBe("new-doc-id");
      expect(firestore.addDoc).toHaveBeenCalled();
    });

    it("should throw error if addDoc fails on joinChallenge", async () => {
      vi.mocked(firestore.addDoc).mockRejectedValueOnce(new Error("Firestore Error"));
      await expect(challengeRepository.joinChallenge("test-user-123", "no-car")).rejects.toThrow("Firestore Error");
    });

    it("should complete challenge in firestore (success)", async () => {
      const mockDocBefore = {
        exists: () => true,
        id: "enrollment-1",
        data: () => ({ userId: "test-user-123", status: "JOINED" }),
      };
      const mockDocAfter = {
        exists: () => true,
        id: "enrollment-1",
        data: () => ({ userId: "test-user-123", status: "COMPLETED", completedAt: { toDate: () => new Date() } }),
      };

      vi.mocked(firestore.getDoc)
        .mockResolvedValueOnce(mockDocBefore as unknown as firestore.DocumentSnapshot)
        .mockResolvedValueOnce(mockDocAfter as unknown as firestore.DocumentSnapshot);

      const res = await challengeRepository.completeChallenge("test-user-123", "enrollment-1");
      expect(res).toBeDefined();
      expect(res.status).toBe("COMPLETED");
      expect(firestore.updateDoc).toHaveBeenCalled();
    });

    it("should throw error if challenge enrollment is not found", async () => {
      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => false,
        id: "enrollment-1",
        data: () => undefined,
      } as unknown as firestore.DocumentSnapshot);

      await expect(challengeRepository.completeChallenge("test-user-123", "enrollment-1"))
        .rejects.toThrow("Challenge enrollment not found or already completed");
    });

    it("should throw error if challenge belongs to different user", async () => {
      const mockDoc = {
        exists: () => true,
        id: "enrollment-1",
        data: () => ({ userId: "other-user", status: "JOINED" }),
      };
      vi.mocked(firestore.getDoc).mockResolvedValueOnce(mockDoc as unknown as firestore.DocumentSnapshot);

      await expect(challengeRepository.completeChallenge("test-user-123", "enrollment-1"))
        .rejects.toThrow("Challenge enrollment not found or already completed");
    });

    it("should throw error if challenge is not in JOINED status", async () => {
      const mockDoc = {
        exists: () => true,
        id: "enrollment-1",
        data: () => ({ userId: "test-user-123", status: "COMPLETED" }),
      };
      vi.mocked(firestore.getDoc).mockResolvedValueOnce(mockDoc as unknown as firestore.DocumentSnapshot);

      await expect(challengeRepository.completeChallenge("test-user-123", "enrollment-1"))
        .rejects.toThrow("Challenge enrollment not found or already completed");
    });

    it("should throw error if failed to load completed challenge details", async () => {
      const mockDocBefore = {
        exists: () => true,
        id: "enrollment-1",
        data: () => ({ userId: "test-user-123", status: "JOINED" }),
      };
      vi.mocked(firestore.getDoc)
        .mockResolvedValueOnce(mockDocBefore as unknown as firestore.DocumentSnapshot)
        .mockResolvedValueOnce({ exists: () => false } as unknown as firestore.DocumentSnapshot);

      await expect(challengeRepository.completeChallenge("test-user-123", "enrollment-1"))
        .rejects.toThrow("Failed to load completed challenge details");
    });

    it("should throw error if getDoc fails on completeChallenge", async () => {
      vi.mocked(firestore.getDoc).mockRejectedValueOnce(new Error("Firestore Error"));
      await expect(challengeRepository.completeChallenge("test-user-123", "enrollment-1")).rejects.toThrow("Firestore Error");
    });

    it("should throw error if updateDoc fails on completeChallenge", async () => {
      const mockDocBefore = {
        exists: () => true,
        id: "enrollment-1",
        data: () => ({ userId: "test-user-123", status: "JOINED" }),
      };
      vi.mocked(firestore.getDoc).mockResolvedValueOnce(mockDocBefore as unknown as firestore.DocumentSnapshot);
      vi.mocked(firestore.updateDoc).mockRejectedValueOnce(new Error("Firestore Error"));

      await expect(challengeRepository.completeChallenge("test-user-123", "enrollment-1")).rejects.toThrow("Firestore Error");
    });
  });

  describe("Report Repository", () => {
    it("should get weekly reports from firestore sorted descending (success)", async () => {
      const mockDoc1 = {
        exists: () => true,
        id: "r1",
        data: () => ({ carbonReduction: 100, createdAt: { toDate: () => new Date("2026-06-18T00:00:00.000Z") } }),
      };
      const mockDoc2 = {
        exists: () => true,
        id: "r2",
        data: () => ({ carbonReduction: 200, createdAt: { toDate: () => new Date("2026-06-19T00:00:00.000Z") } }),
      };
      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [mockDoc1, mockDoc2],
        forEach: (cb: (doc: firestore.QueryDocumentSnapshot) => void) => {
          cb(mockDoc1 as unknown as firestore.QueryDocumentSnapshot);
          cb(mockDoc2 as unknown as firestore.QueryDocumentSnapshot);
        },
      } as unknown as firestore.QuerySnapshot);

      const res = await reportRepository.getWeeklyReports("test-user-123");
      expect(res).toHaveLength(2);
      expect(res[0].id).toBe("r2"); // newest first
      expect(res[1].id).toBe("r1");
    });

    it("should return empty list if weekly reports are empty", async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        empty: true,
        docs: [],
        forEach: () => {},
      } as unknown as firestore.QuerySnapshot);

      const res = await reportRepository.getWeeklyReports("test-user-123");
      expect(res).toHaveLength(0);
    });

    it("should throw error if getDocs fails on getWeeklyReports", async () => {
      vi.mocked(firestore.getDocs).mockRejectedValueOnce(new Error("Firestore Error"));
      await expect(reportRepository.getWeeklyReports("test-user-123")).rejects.toThrow("Firestore Error");
    });

    it("should get weekly report by id from firestore (success)", async () => {
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

    it("should return null if report not found in firestore", async () => {
      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => false,
        id: "report-1",
        data: () => undefined,
      } as unknown as firestore.DocumentSnapshot);

      const res = await reportRepository.getWeeklyReportById("test-user-123", "report-1");
      expect(res).toBeNull();
    });

    it("should throw error if getDoc fails on getWeeklyReportById", async () => {
      vi.mocked(firestore.getDoc).mockRejectedValueOnce(new Error("Firestore Error"));
      await expect(reportRepository.getWeeklyReportById("test-user-123", "report-1")).rejects.toThrow("Firestore Error");
    });

    it("should save weekly report in firestore (success)", async () => {
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

    it("should throw error if addDoc fails on saveWeeklyReport", async () => {
      vi.mocked(firestore.addDoc).mockRejectedValueOnce(new Error("Firestore Error"));
      await expect(reportRepository.saveWeeklyReport("test-user-123", {
        carbonReduction: 100,
        topAccomplishment: "Accomplished",
        missedOpportunities: "Missed",
        recommendedActions: "Actions",
        scoreTrend: "Trend",
      })).rejects.toThrow("Firestore Error");
    });
  });
});
