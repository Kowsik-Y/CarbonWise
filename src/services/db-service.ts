import { userRepository } from "@/repositories/user.repository";
import { assessmentRepository } from "@/repositories/assessment.repository";
import { goalRepository } from "@/repositories/goal.repository";
import { challengeRepository } from "@/repositories/challenge.repository";
import { User, CarbonAssessment, Goal, UserChallenge, Achievement } from "@/types";

export async function getUserProfile(userId: string): Promise<User | null> {
  return userRepository.getUserProfile(userId);
}

export async function createUserProfile(userId: string, data: { name: string; email: string }): Promise<User> {
  return userRepository.createUserProfile(userId, data);
}

export async function updateUserPoints(userId: string, points: number, level: number): Promise<{ points: number; level: number }> {
  return userRepository.updateUserPoints(userId, points, level);
}

export async function getLatestAssessment(userId: string): Promise<CarbonAssessment | null> {
  return assessmentRepository.getLatestAssessment(userId);
}

export async function getAssessmentsHistory(userId: string): Promise<CarbonAssessment[]> {
  return assessmentRepository.getAssessmentsHistory(userId);
}

export async function saveAssessment(userId: string, data: Omit<CarbonAssessment, "id" | "userId" | "createdAt">): Promise<CarbonAssessment> {
  return assessmentRepository.saveAssessment(userId, data);
}

export async function deleteAssessments(userId: string): Promise<void> {
  return assessmentRepository.deleteAssessments(userId);
}

export async function getUserGoals(userId: string): Promise<Goal[]> {
  return goalRepository.getUserGoals(userId);
}

export async function addGoal(
  userId: string, 
  data: { title: string; category: Goal["category"]; co2Reduction: number; difficulty: Goal["difficulty"] }
): Promise<Goal> {
  return goalRepository.addGoal(userId, data);
}

export async function updateGoal(userId: string, goalId: string, status: "ACTIVE" | "COMPLETED"): Promise<Goal | null> {
  return goalRepository.updateGoal(userId, goalId, status);
}

export async function getUserChallenges(userId: string): Promise<UserChallenge[]> {
  return challengeRepository.getUserChallenges(userId);
}

export async function joinChallenge(userId: string, challengeCode: string): Promise<UserChallenge> {
  return challengeRepository.joinChallenge(userId, challengeCode);
}

export async function completeChallenge(userId: string, enrollmentId: string): Promise<UserChallenge> {
  return challengeRepository.completeChallenge(userId, enrollmentId);
}

export async function getUserAchievements(userId: string): Promise<Achievement[]> {
  return userRepository.getUserAchievements(userId);
}

export async function addAchievement(userId: string, title: string, description: string, icon: string): Promise<Achievement> {
  return userRepository.addAchievement(userId, title, description, icon);
}
