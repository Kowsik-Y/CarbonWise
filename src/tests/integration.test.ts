
import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getGoals, POST as postGoal, PATCH as patchGoal } from "@/app/api/goals/route";
import { GET as getChallenges, POST as postChallenge, PATCH as patchChallenge } from "@/app/api/challenges/route";
import { GET as getAssessment, POST as postAssessment, DELETE as deleteAssessment } from "@/app/api/carbon/assessment/route";
import { GET as getDashboard } from "@/app/api/dashboard/route";
import { POST as postChat } from "@/app/api/chat/route";
import { POST as postParseAssessment } from "@/app/api/carbon/parse-assessment/route";
import { goalRepository } from "@/repositories/goal.repository";
import { challengeRepository } from "@/repositories/challenge.repository";
import { assessmentRepository } from "@/repositories/assessment.repository";
import { userRepository } from "@/repositories/user.repository";
import { User, CarbonAssessment, Goal, UserChallenge } from "@/types";

// Mock Firebase config
vi.mock("@/lib/firebase", () => ({
  isFirebaseConfigured: false,
  db: null,
}));

// Mock repositories
vi.mock("@/repositories/user.repository", () => {
  return {
    userRepository: {
      getUserProfile: vi.fn(),
      updateUserPoints: vi.fn(),
      getUserAchievements: vi.fn(),
      addAchievement: vi.fn(),
    },
  };
});

vi.mock("@/repositories/assessment.repository", () => {
  return {
    assessmentRepository: {
      getLatestAssessment: vi.fn(),
      getAssessmentsHistory: vi.fn(),
      saveAssessment: vi.fn(),
      deleteAssessments: vi.fn(),
    },
  };
});

vi.mock("@/repositories/goal.repository", () => {
  return {
    goalRepository: {
      getUserGoals: vi.fn(),
      addGoal: vi.fn(),
      updateGoal: vi.fn(),
    },
  };
});

vi.mock("@/repositories/challenge.repository", () => {
  return {
    challengeRepository: {
      getUserChallenges: vi.fn(),
      joinChallenge: vi.fn(),
      completeChallenge: vi.fn(),
    },
  };
});

// Mock Gemini AI Coach
vi.mock("@/services/ai-coach", () => {
  return {
    generateCoachingResponse: vi.fn().mockResolvedValue("Mock coach answer"),
    generateDynamicChallenges: vi.fn().mockResolvedValue([
      { code: "ai-commute", title: "AI Commute Challenge", category: "transport", difficulty: "easy", duration: "weekly", points: 100, description: "Test description" }
    ]),
    parseAssessmentFromText: vi.fn().mockResolvedValue({ transportKm: 10 }),
  };
});

describe("API Route Integration Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    vi.mocked(assessmentRepository.getLatestAssessment).mockReset();
    vi.mocked(assessmentRepository.getAssessmentsHistory).mockReset();
    vi.mocked(assessmentRepository.saveAssessment).mockReset();
    vi.mocked(assessmentRepository.deleteAssessments).mockReset();

    vi.mocked(userRepository.getUserProfile).mockReset();
    vi.mocked(userRepository.updateUserPoints).mockReset();
    vi.mocked(userRepository.getUserAchievements).mockReset();
    vi.mocked(userRepository.addAchievement).mockReset();

    vi.mocked(goalRepository.getUserGoals).mockReset();
    vi.mocked(goalRepository.addGoal).mockReset();
    vi.mocked(goalRepository.updateGoal).mockReset();

    vi.mocked(challengeRepository.getUserChallenges).mockReset();
    vi.mocked(challengeRepository.joinChallenge).mockReset();
    vi.mocked(challengeRepository.completeChallenge).mockReset();

    vi.mocked(assessmentRepository.getLatestAssessment).mockResolvedValue(null);
    vi.mocked(userRepository.getUserProfile).mockResolvedValue({ id: "test-user-123", points: 100, level: 1 } as unknown as User);
  });

  const createAuthedRequest = (url: string, method: string, body?: unknown, headers: Record<string, string> = {}) => {
    return new NextRequest(url, {
      method,
      headers: {
        "x-user-id": "test-user-123",
        "x-user-email": "test@carbonwise.com",
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  const createUnauthedRequest = (url: string, method: string) => {
    return new NextRequest(url, { method });
  };

  describe("Authentication Gate Checks", () => {
    it("should return 401 Unauthorized if authorization headers are missing", async () => {
      const req = createUnauthedRequest("http://localhost/api/goals", "GET");
      const res = await getGoals(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("/api/goals Routes", () => {
    it("GET: should return user goals list", async () => {
      const mockGoals = [{ id: "g1", title: "Test Goal", status: "ACTIVE" }];
      vi.mocked(goalRepository.getUserGoals).mockResolvedValue(mockGoals as unknown as Goal[]);

      const req = createAuthedRequest("http://localhost/api/goals", "GET");
      const res = await getGoals(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.goals).toEqual(mockGoals);
    });

    it("GET: should return 500 when repository throws on fetch", async () => {
      vi.mocked(goalRepository.getUserGoals).mockRejectedValue(new Error("Goal DB error"));
      const req = createAuthedRequest("http://localhost/api/goals", "GET");
      const res = await getGoals(req);
      expect(res.status).toBe(500);
    });

    it("POST: should validate goal inputs and return 400 for bad category", async () => {
      const req = createAuthedRequest("http://localhost/api/goals", "POST", {
        title: "Test Goal",
        category: "invalid_category",
        co2Reduction: 200,
        difficulty: "easy",
      });
      const res = await postGoal(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Invalid goal parameters");
    });

    it("POST: should fail if active goals limit (10) is exceeded", async () => {
      const activeGoals = Array(10).fill({ id: "g", status: "ACTIVE" });
      vi.mocked(goalRepository.getUserGoals).mockResolvedValue(activeGoals as unknown as Goal[]);

      const req = createAuthedRequest("http://localhost/api/goals", "POST", {
        title: "Another Goal",
        category: "food",
        co2Reduction: 100,
        difficulty: "easy",
      });
      const res = await postGoal(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("maximum of 10 active goals");
    });

    it("POST: should add a valid goal successfully", async () => {
      const mockGoal = { id: "g1", title: "Eat Veggies", category: "food", co2Reduction: 100, difficulty: "easy", status: "ACTIVE" };
      vi.mocked(goalRepository.getUserGoals).mockResolvedValue([]);
      vi.mocked(goalRepository.addGoal).mockResolvedValue(mockGoal as unknown as Goal);

      const req = createAuthedRequest("http://localhost/api/goals", "POST", {
        title: "Eat Veggies",
        category: "food",
        co2Reduction: 100,
        difficulty: "easy",
      });
      const res = await postGoal(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.goal).toEqual(mockGoal);
    });

    it("POST: should return 500 when repository throws on add", async () => {
      vi.mocked(goalRepository.getUserGoals).mockResolvedValue([]);
      vi.mocked(goalRepository.addGoal).mockRejectedValue(new Error("Goal add failed"));
      const req = createAuthedRequest("http://localhost/api/goals", "POST", {
        title: "Eat Veggies",
        category: "food",
        co2Reduction: 100,
        difficulty: "easy",
      });
      const res = await postGoal(req);
      expect(res.status).toBe(500);
    });

    it("PATCH: should return 400 for validation failures", async () => {
      const req = createAuthedRequest("http://localhost/api/goals", "PATCH", {
        id: "",
        status: "INVALID",
      });
      const res = await patchGoal(req);
      expect(res.status).toBe(400);
    });

    it("PATCH: should return 404 if goal is not found", async () => {
      vi.mocked(goalRepository.getUserGoals).mockResolvedValue([]);
      const req = createAuthedRequest("http://localhost/api/goals", "PATCH", {
        id: "missing-id",
        status: "COMPLETED",
      });
      const res = await patchGoal(req);
      expect(res.status).toBe(404);
    });

    it("PATCH: should return 400 if goal is already completed", async () => {
      const mockGoal = { id: "g1", status: "COMPLETED" };
      vi.mocked(goalRepository.getUserGoals).mockResolvedValue([mockGoal] as unknown as Goal[]);

      const req = createAuthedRequest("http://localhost/api/goals", "PATCH", {
        id: "g1",
        status: "COMPLETED",
      });
      const res = await patchGoal(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Goal is already completed");
    });

    it("PATCH: should complete active goal, award XP points and unlock achievements", async () => {
      const mockGoal = { id: "g1", status: "ACTIVE", difficulty: "hard", category: "energy", co2Reduction: 200 };
      vi.mocked(goalRepository.getUserGoals)
        .mockResolvedValueOnce([mockGoal] as unknown as Goal[])
        .mockResolvedValueOnce([{ ...mockGoal, status: "COMPLETED" }] as unknown as Goal[]);

      vi.mocked(userRepository.getUserProfile).mockResolvedValue({ id: "u1", points: 100, level: 1 } as unknown as User);
      vi.mocked(goalRepository.updateGoal).mockResolvedValue({ ...mockGoal, status: "COMPLETED" } as unknown as Goal);

      const req = createAuthedRequest("http://localhost/api/goals", "PATCH", {
        id: "g1",
        status: "COMPLETED",
      });
      const res = await patchGoal(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.pointsAwarded).toBe(200);
      expect(userRepository.updateUserPoints).toHaveBeenCalledWith("test-user-123", 300, 2);
      expect(userRepository.addAchievement).toHaveBeenCalledWith("test-user-123", "First Steps", expect.any(String), "target");
    });

    it("PATCH: should unlock Eco Warrior achievement if 5 goals are completed", async () => {
      const mockGoal = { id: "g1", status: "ACTIVE", difficulty: "easy", category: "food", co2Reduction: 50 };
      vi.mocked(goalRepository.getUserGoals)
        .mockResolvedValueOnce([mockGoal] as unknown as Goal[])
        .mockResolvedValueOnce(Array(5).fill({ status: "COMPLETED" }) as unknown as Goal[]);

      vi.mocked(userRepository.getUserProfile).mockResolvedValue({ id: "u1", points: 100, level: 1 } as unknown as User);
      vi.mocked(goalRepository.updateGoal).mockResolvedValue({ ...mockGoal, status: "COMPLETED" } as unknown as Goal);

      const req = createAuthedRequest("http://localhost/api/goals", "PATCH", {
        id: "g1",
        status: "COMPLETED",
      });
      const res = await patchGoal(req);
      expect(res.status).toBe(200);
      expect(userRepository.addAchievement).toHaveBeenCalledWith("test-user-123", "Eco Warrior", expect.any(String), "award");
    });

    it("PATCH: should handle non-completed status update (e.g. updating to ACTIVE again or other status)", async () => {
      const mockGoal = { id: "g1", status: "COMPLETED", difficulty: "hard" };
      vi.mocked(goalRepository.getUserGoals).mockResolvedValue([mockGoal] as unknown as Goal[]);
      vi.mocked(goalRepository.updateGoal).mockResolvedValue({ ...mockGoal, status: "ACTIVE" } as unknown as Goal);

      const req = createAuthedRequest("http://localhost/api/goals", "PATCH", {
        id: "g1",
        status: "ACTIVE",
      });
      const res = await patchGoal(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.pointsAwarded).toBe(0);
      expect(userRepository.updateUserPoints).not.toHaveBeenCalled();
    });

    it("PATCH: should award 100 points for medium difficulty goals and promote level to 3", async () => {
      const mockGoal = { id: "g1", status: "ACTIVE", difficulty: "medium" };
      vi.mocked(goalRepository.getUserGoals)
        .mockResolvedValueOnce([mockGoal] as unknown as Goal[])
        .mockResolvedValueOnce([{ ...mockGoal, status: "COMPLETED" }] as unknown as Goal[]);

      vi.mocked(userRepository.getUserProfile).mockResolvedValue({ id: "u1", points: 400, level: 2 } as unknown as User);
      vi.mocked(goalRepository.updateGoal).mockResolvedValue({ ...mockGoal, status: "COMPLETED" } as unknown as Goal);

      const req = createAuthedRequest("http://localhost/api/goals", "PATCH", {
        id: "g1",
        status: "COMPLETED",
      });
      const res = await patchGoal(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.pointsAwarded).toBe(100);
      expect(userRepository.updateUserPoints).toHaveBeenCalledWith("test-user-123", 500, 3);
    });

    it("PATCH: should award 50 points for easy difficulty goals and promote level to 4", async () => {
      const mockGoal = { id: "g1", status: "ACTIVE", difficulty: "easy" };
      vi.mocked(goalRepository.getUserGoals)
        .mockResolvedValueOnce([mockGoal] as unknown as Goal[])
        .mockResolvedValueOnce([{ ...mockGoal, status: "COMPLETED" }] as unknown as Goal[]);

      vi.mocked(userRepository.getUserProfile).mockResolvedValue({ id: "u1", points: 950, level: 3 } as unknown as User);
      vi.mocked(goalRepository.updateGoal).mockResolvedValue({ ...mockGoal, status: "COMPLETED" } as unknown as Goal);

      const req = createAuthedRequest("http://localhost/api/goals", "PATCH", {
        id: "g1",
        status: "COMPLETED",
      });
      const res = await patchGoal(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.pointsAwarded).toBe(50);
      expect(userRepository.updateUserPoints).toHaveBeenCalledWith("test-user-123", 1000, 4);
    });

    it("PATCH: should handle goal completion when user profile is null", async () => {
      const mockGoal = { id: "g1", status: "ACTIVE", difficulty: "hard" };
      vi.mocked(goalRepository.getUserGoals)
        .mockResolvedValueOnce([mockGoal] as unknown as Goal[])
        .mockResolvedValueOnce([{ ...mockGoal, status: "COMPLETED" }] as unknown as Goal[]);

      vi.mocked(userRepository.getUserProfile).mockResolvedValue(null as unknown as User);
      vi.mocked(goalRepository.updateGoal).mockResolvedValue({ ...mockGoal, status: "COMPLETED" } as unknown as Goal);

      const req = createAuthedRequest("http://localhost/api/goals", "PATCH", {
        id: "g1",
        status: "COMPLETED",
      });
      const res = await patchGoal(req);
      expect(res.status).toBe(200);
      expect(userRepository.updateUserPoints).not.toHaveBeenCalled();
    });

    it("PATCH: should not award achievements when goals completed count is not 1 or 5 (e.g. 2)", async () => {
      const mockGoal = { id: "g1", status: "ACTIVE", difficulty: "hard" };
      vi.mocked(goalRepository.getUserGoals)
        .mockResolvedValueOnce([mockGoal] as unknown as Goal[])
        .mockResolvedValueOnce([
          { id: "g1", status: "COMPLETED" },
          { id: "g2", status: "COMPLETED" },
        ] as unknown as Goal[]);

      vi.mocked(userRepository.getUserProfile).mockResolvedValue({ id: "u1", points: 100, level: 1 } as unknown as User);
      vi.mocked(goalRepository.updateGoal).mockResolvedValue({ ...mockGoal, status: "COMPLETED" } as unknown as Goal);

      const req = createAuthedRequest("http://localhost/api/goals", "PATCH", {
        id: "g1",
        status: "COMPLETED",
      });
      const res = await patchGoal(req);
      expect(res.status).toBe(200);
      expect(userRepository.addAchievement).not.toHaveBeenCalled();
    });

    it("PATCH: should return 500 when repository throws on update", async () => {
      const mockGoal = { id: "g1", status: "ACTIVE", difficulty: "hard" };
      vi.mocked(goalRepository.getUserGoals).mockResolvedValue([mockGoal] as unknown as Goal[]);
      vi.mocked(goalRepository.updateGoal).mockRejectedValue(new Error("Goal update failed"));
      const req = createAuthedRequest("http://localhost/api/goals", "PATCH", {
        id: "g1",
        status: "COMPLETED",
      });
      const res = await patchGoal(req);
      expect(res.status).toBe(500);
    });
  });

  describe("/api/challenges Routes", () => {
    it("GET: should fetch combined weekly and dynamic challenges catalog", async () => {
      vi.mocked(challengeRepository.getUserChallenges).mockResolvedValue([]);
      vi.mocked(assessmentRepository.getLatestAssessment).mockResolvedValue({ id: "ass1" } as unknown as CarbonAssessment);

      const req = createAuthedRequest("http://localhost/api/challenges", "GET");
      const res = await getChallenges(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.challenges).toBeDefined();
      expect(data.challenges.some((c: { code: string }) => c.code === "ai-commute")).toBe(true);
      expect(data.userChallenges).toEqual([]);
    });

    it("GET: should return 500 when repository throws on fetch", async () => {
      vi.mocked(challengeRepository.getUserChallenges).mockRejectedValue(new Error("Challenges DB error"));
      const req = createAuthedRequest("http://localhost/api/challenges", "GET");
      const res = await getChallenges(req);
      expect(res.status).toBe(500);
    });

    it("POST: should reject join request with 400 if validation fails", async () => {
      const req = createAuthedRequest("http://localhost/api/challenges", "POST", {});
      const res = await postChallenge(req);
      expect(res.status).toBe(400);
    });

    it("POST: should return 404 if challenge is not found in catalog", async () => {
      const req = createAuthedRequest("http://localhost/api/challenges", "POST", { challengeCode: "invalid-code" });
      const res = await postChallenge(req);
      expect(res.status).toBe(404);
    });

    it("POST: should successfully join valid challenge", async () => {
      const mockEnrollment = { id: "enroll-1", challengeCode: "no-car-tuesday", status: "JOINED" };
      vi.mocked(challengeRepository.joinChallenge).mockResolvedValue(mockEnrollment as unknown as UserChallenge as UserChallenge);

      const req = createAuthedRequest("http://localhost/api/challenges", "POST", { challengeCode: "no-car-tuesday" });
      const res = await postChallenge(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.userChallenge).toEqual(mockEnrollment);
    });

    it("POST: should return 400 if repository throws due to duplicate enrollment", async () => {
      vi.mocked(challengeRepository.joinChallenge).mockRejectedValue(new Error("Already joined"));

      const req = createAuthedRequest("http://localhost/api/challenges", "POST", { challengeCode: "no-car-tuesday" });
      const res = await postChallenge(req);
      expect(res.status).toBe(400);
    });

    it("POST: should return 500 when parsing fails on unexpected throw", async () => {
      vi.mocked(assessmentRepository.getLatestAssessment).mockRejectedValue(new Error("Assessment DB error"));
      const req = createAuthedRequest("http://localhost/api/challenges", "POST", { challengeCode: "no-car-tuesday" });
      const res = await postChallenge(req);
      expect(res.status).toBe(500);
    });

    it("PATCH: should return 400 if validation fails", async () => {
      const req = createAuthedRequest("http://localhost/api/challenges", "PATCH", {});
      const res = await patchChallenge(req);
      expect(res.status).toBe(400);
    });

    it("PATCH: should return 404 if enrollment not found", async () => {
      vi.mocked(challengeRepository.getUserChallenges).mockResolvedValue([]);

      const req = createAuthedRequest("http://localhost/api/challenges", "PATCH", { id: "enroll-1" });
      const res = await patchChallenge(req);
      expect(res.status).toBe(404);
    });

    it("PATCH: should return 404 if challenge catalog entry is missing on complete", async () => {
      const mockEnrollment = { id: "enroll-1", challengeCode: "invalid-code-not-in-catalog", status: "JOINED" };
      vi.mocked(challengeRepository.getUserChallenges).mockResolvedValue([mockEnrollment] as unknown as UserChallenge[]);

      const req = createAuthedRequest("http://localhost/api/challenges", "PATCH", { id: "enroll-1" });
      const res = await patchChallenge(req);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Challenge catalog entry missing");
    });

    it("PATCH: should successfully complete challenge, award points and achievements", async () => {
      const mockEnrollment = { id: "enroll-1", challengeCode: "no-car-tuesday", status: "JOINED" };
      vi.mocked(challengeRepository.getUserChallenges)
        .mockResolvedValueOnce([mockEnrollment] as unknown as UserChallenge[])
        .mockResolvedValueOnce([{ ...mockEnrollment, status: "COMPLETED" }] as unknown as UserChallenge[]);

      vi.mocked(userRepository.getUserProfile).mockResolvedValue({ id: "u1", points: 50, level: 1 } as unknown as User);
      vi.mocked(challengeRepository.completeChallenge).mockResolvedValue({ ...mockEnrollment, status: "COMPLETED" } as unknown as UserChallenge);

      const req = createAuthedRequest("http://localhost/api/challenges", "PATCH", { id: "enroll-1" });
      const res = await patchChallenge(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.pointsAwarded).toBe(80);
      expect(userRepository.updateUserPoints).toHaveBeenCalledWith("test-user-123", 130, 1);
      expect(userRepository.addAchievement).toHaveBeenCalledWith("test-user-123", "Challenger", expect.any(String), "zap");
    });

    it("PATCH: should unlock Eco Champion achievement if 3 challenges are completed", async () => {
      const mockEnrollment = { id: "enroll-1", challengeCode: "no-car-tuesday", status: "JOINED" };
      vi.mocked(challengeRepository.getUserChallenges)
        .mockResolvedValueOnce([mockEnrollment] as unknown as UserChallenge[])
        .mockResolvedValueOnce([
          { ...mockEnrollment, status: "COMPLETED" },
          { id: "e2", challengeCode: "plant-based-weekend", status: "COMPLETED" },
          { id: "e3", challengeCode: "energy-saver-week", status: "COMPLETED" }
        ] as unknown as UserChallenge[]);

      vi.mocked(userRepository.getUserProfile).mockResolvedValue({ id: "u1", points: 200, level: 2 } as unknown as User);
      vi.mocked(challengeRepository.completeChallenge).mockResolvedValue({ ...mockEnrollment, status: "COMPLETED" } as unknown as UserChallenge);

      const req = createAuthedRequest("http://localhost/api/challenges", "PATCH", { id: "enroll-1" });
      const res = await patchChallenge(req);
      expect(res.status).toBe(200);
      expect(userRepository.addAchievement).toHaveBeenCalledWith("test-user-123", "Eco Champion", expect.any(String), "shield");
    });

    it("PATCH: should handle challenges completion when user profile is null", async () => {
      const mockEnrollment = { id: "enroll-1", challengeCode: "no-car-tuesday", status: "JOINED" };
      vi.mocked(challengeRepository.getUserChallenges)
        .mockResolvedValueOnce([mockEnrollment] as unknown as UserChallenge[])
        .mockResolvedValueOnce([{ ...mockEnrollment, status: "COMPLETED" }] as unknown as UserChallenge[]);

      vi.mocked(userRepository.getUserProfile).mockResolvedValue(null as unknown as User);
      vi.mocked(challengeRepository.completeChallenge).mockResolvedValue({ ...mockEnrollment, status: "COMPLETED" } as unknown as UserChallenge);

      const req = createAuthedRequest("http://localhost/api/challenges", "PATCH", { id: "enroll-1" });
      const res = await patchChallenge(req);
      expect(res.status).toBe(200);
      expect(userRepository.updateUserPoints).not.toHaveBeenCalled();
    });

    it("PATCH: should promote user level to 3 when challenge completed and user has high points", async () => {
      const mockEnrollment = { id: "enroll-1", challengeCode: "no-car-tuesday", status: "JOINED" };
      vi.mocked(challengeRepository.getUserChallenges)
        .mockResolvedValueOnce([mockEnrollment] as unknown as UserChallenge[])
        .mockResolvedValueOnce([{ ...mockEnrollment, status: "COMPLETED" }] as unknown as UserChallenge[]);

      vi.mocked(userRepository.getUserProfile).mockResolvedValue({ id: "u1", points: 450, level: 2 } as unknown as User);
      vi.mocked(challengeRepository.completeChallenge).mockResolvedValue({ ...mockEnrollment, status: "COMPLETED" } as unknown as UserChallenge);

      const req = createAuthedRequest("http://localhost/api/challenges", "PATCH", { id: "enroll-1" });
      const res = await patchChallenge(req);
      expect(res.status).toBe(200);
      expect(userRepository.updateUserPoints).toHaveBeenCalledWith("test-user-123", 530, 3);
    });

    it("PATCH: should promote user level to 4 when challenge completed and user has high points", async () => {
      const mockEnrollment = { id: "enroll-1", challengeCode: "no-car-tuesday", status: "JOINED" };
      vi.mocked(challengeRepository.getUserChallenges)
        .mockResolvedValueOnce([mockEnrollment] as unknown as UserChallenge[])
        .mockResolvedValueOnce([{ ...mockEnrollment, status: "COMPLETED" }] as unknown as UserChallenge[]);

      vi.mocked(userRepository.getUserProfile).mockResolvedValue({ id: "u1", points: 950, level: 3 } as unknown as User);
      vi.mocked(challengeRepository.completeChallenge).mockResolvedValue({ ...mockEnrollment, status: "COMPLETED" } as unknown as UserChallenge);

      const req = createAuthedRequest("http://localhost/api/challenges", "PATCH", { id: "enroll-1" });
      const res = await patchChallenge(req);
      expect(res.status).toBe(200);
      expect(userRepository.updateUserPoints).toHaveBeenCalledWith("test-user-123", 1030, 4);
    });

    it("PATCH: should not unlock achievement if completed count is neither 1 nor 3 (e.g. 2)", async () => {
      const mockEnrollment = { id: "enroll-1", challengeCode: "no-car-tuesday", status: "JOINED" };
      vi.mocked(challengeRepository.getUserChallenges)
        .mockResolvedValueOnce([mockEnrollment] as unknown as UserChallenge[])
        .mockResolvedValueOnce([
          { ...mockEnrollment, status: "COMPLETED" },
          { id: "e2", challengeCode: "plant-based-weekend", status: "COMPLETED" },
        ] as unknown as UserChallenge[]);

      vi.mocked(userRepository.getUserProfile).mockResolvedValue({ id: "u1", points: 200, level: 2 } as unknown as User);
      vi.mocked(challengeRepository.completeChallenge).mockResolvedValue({ ...mockEnrollment, status: "COMPLETED" } as unknown as UserChallenge);

      const req = createAuthedRequest("http://localhost/api/challenges", "PATCH", { id: "enroll-1" });
      const res = await patchChallenge(req);
      expect(res.status).toBe(200);
      expect(userRepository.addAchievement).not.toHaveBeenCalled();
    });

    it("PATCH: should use empty dynamic challenges when assessment is null", async () => {
      const mockEnrollment = { id: "enroll-1", challengeCode: "no-car-tuesday", status: "JOINED" };
      vi.mocked(challengeRepository.getUserChallenges)
        .mockResolvedValueOnce([mockEnrollment] as unknown as UserChallenge[])
        .mockResolvedValueOnce([{ ...mockEnrollment, status: "COMPLETED" }] as unknown as UserChallenge[]);

      vi.mocked(userRepository.getUserProfile).mockResolvedValue({ id: "u1", points: 200, level: 2 } as unknown as User);
      vi.mocked(challengeRepository.completeChallenge).mockResolvedValue({ ...mockEnrollment, status: "COMPLETED" } as unknown as UserChallenge);

      const req = createAuthedRequest("http://localhost/api/challenges", "PATCH", { id: "enroll-1" });
      const res = await patchChallenge(req);
      expect(res.status).toBe(200);
    });

    it("PATCH: should return 500 when completion throws unexpected error", async () => {
      const mockEnrollment = { id: "enroll-1", challengeCode: "no-car-tuesday", status: "JOINED" };
      vi.mocked(challengeRepository.getUserChallenges).mockResolvedValue([mockEnrollment] as unknown as UserChallenge[]);
      vi.mocked(challengeRepository.completeChallenge).mockRejectedValue(new Error("DB error"));

      const req = createAuthedRequest("http://localhost/api/challenges", "PATCH", { id: "enroll-1" });
      const res = await patchChallenge(req);
      expect(res.status).toBe(500);
    });
  });

  describe("/api/carbon/assessment Routes", () => {
    it("GET: should return null or latest assessment", async () => {
      const mockAss = { id: "ass1", carbonScore: 88 };
      vi.mocked(assessmentRepository.getLatestAssessment).mockResolvedValue(mockAss as unknown as CarbonAssessment as CarbonAssessment);

      const req = createAuthedRequest("http://localhost/api/carbon/assessment", "GET");
      const res = await getAssessment(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.assessment).toEqual(mockAss);
    });

    it("GET: should return 500 when assessment fetch throws", async () => {
      vi.mocked(assessmentRepository.getLatestAssessment).mockRejectedValue(new Error("Fetch error"));
      const req = createAuthedRequest("http://localhost/api/carbon/assessment", "GET");
      const res = await getAssessment(req);
      expect(res.status).toBe(500);
    });

    it("POST: should fail for invalid assessment fields", async () => {
      const req = createAuthedRequest("http://localhost/api/carbon/assessment", "POST", {
        transportKm: -5,
        transportType: "car_petrol",
      });
      const res = await postAssessment(req);
      expect(res.status).toBe(400);
    });

    it("POST: should successfully save assessment and update user profile stats (first assessment)", async () => {
      const savedAss = { id: "ass-1", carbonScore: 85 };
      vi.mocked(assessmentRepository.saveAssessment).mockResolvedValue(savedAss as unknown as CarbonAssessment as CarbonAssessment);
      vi.mocked(assessmentRepository.getAssessmentsHistory).mockResolvedValue([savedAss] as unknown as CarbonAssessment[]);
      vi.mocked(userRepository.getUserProfile).mockResolvedValue({ id: "u1", points: 0, level: 1 } as unknown as User);

      const req = createAuthedRequest("http://localhost/api/carbon/assessment", "POST", {
        transportKm: 10,
        transportType: "car_petrol",
        electricityBill: 100,
        electricityKwh: 200,
        foodHabits: "low_meat",
        shoppingHabits: "average",
        wasteHabits: "recycle_some",
      });

      const res = await postAssessment(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.assessment).toEqual(savedAss);
      expect(data.pointsAwarded).toBe(150);
      expect(userRepository.updateUserPoints).toHaveBeenCalledWith("test-user-123", 150, 1);
      expect(userRepository.addAchievement).toHaveBeenCalledWith("test-user-123", "Carbon Pioneer", expect.any(String), "compass");
    });

    it("POST: should save subsequent assessment and award 50 points", async () => {
      const savedAss = { id: "ass-2", carbonScore: 88 };
      vi.mocked(assessmentRepository.saveAssessment).mockResolvedValue(savedAss as unknown as CarbonAssessment as CarbonAssessment);
      vi.mocked(assessmentRepository.getAssessmentsHistory).mockResolvedValue([{ id: "ass-1" }, savedAss] as unknown as CarbonAssessment[]);
      vi.mocked(userRepository.getUserProfile).mockResolvedValue({ id: "u1", points: 150, level: 1 } as unknown as User);

      const req = createAuthedRequest("http://localhost/api/carbon/assessment", "POST", {
        transportKm: 10,
        transportType: "car_petrol",
        electricityBill: 100,
        electricityKwh: 200,
        foodHabits: "low_meat",
        shoppingHabits: "average",
        wasteHabits: "recycle_some",
      });

      const res = await postAssessment(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.pointsAwarded).toBe(50);
      expect(userRepository.updateUserPoints).toHaveBeenCalledWith("test-user-123", 200, 2);
    });

    it("POST: should handle assessment save when user profile is null", async () => {
      const savedAss = { id: "ass-1", carbonScore: 85 };
      vi.mocked(assessmentRepository.saveAssessment).mockResolvedValue(savedAss as unknown as CarbonAssessment as CarbonAssessment);
      vi.mocked(assessmentRepository.getAssessmentsHistory).mockResolvedValue([savedAss] as unknown as CarbonAssessment[]);
      vi.mocked(userRepository.getUserProfile).mockResolvedValue(null as unknown as User);

      const req = createAuthedRequest("http://localhost/api/carbon/assessment", "POST", {
        transportKm: 10,
        transportType: "car_petrol",
        electricityBill: 100,
        electricityKwh: 200,
        foodHabits: "low_meat",
        shoppingHabits: "average",
        wasteHabits: "recycle_some",
      });

      const res = await postAssessment(req);
      expect(res.status).toBe(200);
      expect(userRepository.updateUserPoints).not.toHaveBeenCalled();
    });

    it("POST: should promote user level to 3 when assessment completed and user has high points", async () => {
      const savedAss = { id: "ass-1", carbonScore: 85 };
      vi.mocked(assessmentRepository.saveAssessment).mockResolvedValue(savedAss as unknown as CarbonAssessment as CarbonAssessment);
      vi.mocked(assessmentRepository.getAssessmentsHistory).mockResolvedValue([savedAss] as unknown as CarbonAssessment[]);

      vi.mocked(userRepository.getUserProfile).mockResolvedValue({ id: "u1", points: 400, level: 2 } as unknown as User);
      const req = createAuthedRequest("http://localhost/api/carbon/assessment", "POST", {
        transportKm: 10,
        transportType: "car_petrol",
        electricityBill: 100,
        electricityKwh: 200,
        foodHabits: "low_meat",
        shoppingHabits: "average",
        wasteHabits: "recycle_some",
      });
      const res = await postAssessment(req);
      expect(res.status).toBe(200);
      expect(userRepository.updateUserPoints).toHaveBeenCalledWith("test-user-123", 550, 3);
    });

    it("POST: should promote user level to 4 when assessment completed and user has high points", async () => {
      const savedAss = { id: "ass-1", carbonScore: 85 };
      vi.mocked(assessmentRepository.saveAssessment).mockResolvedValue(savedAss as unknown as CarbonAssessment as CarbonAssessment);
      vi.mocked(assessmentRepository.getAssessmentsHistory).mockResolvedValue([savedAss] as unknown as CarbonAssessment[]);

      vi.mocked(userRepository.getUserProfile).mockResolvedValue({ id: "u1", points: 900, level: 3 } as unknown as User);
      const req = createAuthedRequest("http://localhost/api/carbon/assessment", "POST", {
        transportKm: 10,
        transportType: "car_petrol",
        electricityBill: 100,
        electricityKwh: 200,
        foodHabits: "low_meat",
        shoppingHabits: "average",
        wasteHabits: "recycle_some",
      });
      const res = await postAssessment(req);
      expect(res.status).toBe(200);
      expect(userRepository.updateUserPoints).toHaveBeenCalledWith("test-user-123", 1050, 4);
    });

    it("POST: should return 500 when save assessment throws", async () => {
      vi.mocked(assessmentRepository.saveAssessment).mockRejectedValue(new Error("Save error"));
      const req = createAuthedRequest("http://localhost/api/carbon/assessment", "POST", {
        transportKm: 10,
        transportType: "car_petrol",
        electricityBill: 100,
        electricityKwh: 200,
        foodHabits: "low_meat",
        shoppingHabits: "average",
        wasteHabits: "recycle_some",
      });
      const res = await postAssessment(req);
      expect(res.status).toBe(500);
    });

    it("DELETE: should successfully delete all user assessments", async () => {
      const req = createAuthedRequest("http://localhost/api/carbon/assessment", "DELETE");
      const res = await deleteAssessment(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(assessmentRepository.deleteAssessments).toHaveBeenCalledWith("test-user-123");
    });

    it("DELETE: should return 500 when delete throws", async () => {
      vi.mocked(assessmentRepository.deleteAssessments).mockRejectedValue(new Error("Delete error"));
      const req = createAuthedRequest("http://localhost/api/carbon/assessment", "DELETE");
      const res = await deleteAssessment(req);
      expect(res.status).toBe(500);
    });
  });

  describe("/api/dashboard Route", () => {
    it("GET: should return full profile stats", async () => {
      const mockUser = { id: "u1", name: "User", points: 100, level: 1 };
      const mockAss = { id: "ass1", carbonScore: 75, annualFootprint: 5000, transportEmissions: 1000, energyEmissions: 1000, foodEmissions: 1000, shoppingEmissions: 1000, wasteEmissions: 1000, monthlyFootprint: 416 };

      vi.mocked(userRepository.getUserProfile).mockResolvedValue(mockUser as unknown as User as User);
      vi.mocked(assessmentRepository.getLatestAssessment).mockResolvedValue(mockAss as unknown as CarbonAssessment as CarbonAssessment);
      vi.mocked(assessmentRepository.getAssessmentsHistory).mockResolvedValue([mockAss] as unknown as CarbonAssessment[]);
      vi.mocked(goalRepository.getUserGoals).mockResolvedValue([]);
      vi.mocked(challengeRepository.getUserChallenges).mockResolvedValue([]);
      vi.mocked(userRepository.getUserAchievements).mockResolvedValue([]);

      const req = createAuthedRequest("http://localhost/api/dashboard", "GET");
      const res = await getDashboard(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user).toEqual(mockUser);
      expect(data.latestAssessment).toEqual(mockAss);
    });

    it("GET: should return 404 if user profile is not found", async () => {
      vi.mocked(userRepository.getUserProfile).mockResolvedValue(null);
      const req = createAuthedRequest("http://localhost/api/dashboard", "GET");
      const res = await getDashboard(req);
      expect(res.status).toBe(404);
    });

    it("GET: should return 500 when profile fetch throws", async () => {
      vi.mocked(userRepository.getUserProfile).mockRejectedValue(new Error("Dashboard error"));
      const req = createAuthedRequest("http://localhost/api/dashboard", "GET");
      const res = await getDashboard(req);
      expect(res.status).toBe(500);
    });
  });

  describe("/api/chat Route", () => {
    it("POST: should prompt chat message validation and return reply", async () => {
      vi.mocked(assessmentRepository.getLatestAssessment).mockResolvedValue(null);

      const req = createAuthedRequest("http://localhost/api/chat", "POST", {
        message: "Hello Coach!",
      });
      const res = await postChat(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.reply).toBe("Mock coach answer");
    });

    it("POST: should return 400 if validation fails", async () => {
      const req = createAuthedRequest("http://localhost/api/chat", "POST", {
        message: "",
      });
      const res = await postChat(req);
      expect(res.status).toBe(400);
    });

    it("POST: should prompt chat with assessment context if user has an assessment", async () => {
      vi.mocked(assessmentRepository.getLatestAssessment).mockResolvedValue({ id: "ass-1", carbonScore: 78 } as unknown as CarbonAssessment);

      const req = createAuthedRequest("http://localhost/api/chat", "POST", {
        message: "Hello Coach!",
      });
      const res = await postChat(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.reply).toBe("Mock coach answer");
    });

    it("POST: should return 500 when chat throws", async () => {
      vi.mocked(assessmentRepository.getLatestAssessment).mockRejectedValue(new Error("Chat error"));
      const req = createAuthedRequest("http://localhost/api/chat", "POST", {
        message: "Hello Coach!",
      });
      const res = await postChat(req);
      expect(res.status).toBe(500);
    });

    it("POST: should return 400 if message exceeds 3000 characters", async () => {
      const req = createAuthedRequest("http://localhost/api/chat", "POST", {
        message: "a".repeat(3001),
      });
      const res = await postChat(req);
      expect(res.status).toBe(400);
    });
  });

  describe("/api/carbon/parse-assessment Route", () => {
    it("POST: should parse natural language and return parsed values", async () => {
      const req = createAuthedRequest("http://localhost/api/carbon/parse-assessment", "POST", {
        text: "I commute 10km by car and eat vegan diet.",
      });
      const res = await postParseAssessment(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.values).toEqual({ transportKm: 10 });
    });

    it("POST: should return 400 if validation fails", async () => {
      const req = createAuthedRequest("http://localhost/api/carbon/parse-assessment", "POST", {
        text: "",
      });
      const res = await postParseAssessment(req);
      expect(res.status).toBe(400);
    });

    it("POST: should return 400 if text exceeds 3000 characters", async () => {
      const req = createAuthedRequest("http://localhost/api/carbon/parse-assessment", "POST", {
        text: "a".repeat(3001),
      });
      const res = await postParseAssessment(req);
      expect(res.status).toBe(400);
    });
  });
});
