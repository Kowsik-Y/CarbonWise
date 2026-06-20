import { userRepository } from "@/repositories/user.repository";
import { assessmentRepository } from "@/repositories/assessment.repository";
import { goalRepository } from "@/repositories/goal.repository";
import { challengeRepository } from "@/repositories/challenge.repository";
import { User, CarbonAssessment, Goal, UserChallenge, Achievement } from "@/types";

/**
 * Retrieves a user's profile by ID.
 * 
 * @param userId - Unique identifier of the user.
 * @returns Decoded User profile or null.
 */
export async function getUserProfile(userId: string): Promise<User | null> {
  return userRepository.getUserProfile(userId);
}

/**
 * Creates a new user profile record.
 * 
 * @param userId - Unique identifier for the user.
 * @param data - User name and email.
 * @returns Decoded created User profile.
 */
export async function createUserProfile(userId: string, data: { name: string; email: string }): Promise<User> {
  return userRepository.createUserProfile(userId, data);
}

/**
 * Updates user points and rank level.
 * 
 * @param userId - Unique identifier of the user.
 * @param points - Accumulated points.
 * @param level - Rank level.
 * @returns Decoded updated points and level object.
 */
export async function updateUserPoints(userId: string, points: number, level: number): Promise<{ points: number; level: number }> {
  return userRepository.updateUserPoints(userId, points, level);
}

/**
 * Retrieves the latest carbon assessment for a user.
 * 
 * @param userId - Unique identifier of the user.
 * @returns Latest CarbonAssessment or null.
 */
export async function getLatestAssessment(userId: string): Promise<CarbonAssessment | null> {
  return assessmentRepository.getLatestAssessment(userId);
}

/**
 * Retrieves the user's carbon assessment history.
 * 
 * @param userId - Unique identifier of the user.
 * @returns List of CarbonAssessments.
 */
export async function getAssessmentsHistory(userId: string): Promise<CarbonAssessment[]> {
  return assessmentRepository.getAssessmentsHistory(userId);
}

/**
 * Saves a new carbon assessment.
 * 
 * @param userId - Unique identifier of the user.
 * @param data - Assessment input data.
 * @returns Saved CarbonAssessment.
 */
export async function saveAssessment(userId: string, data: Omit<CarbonAssessment, "id" | "userId" | "createdAt">): Promise<CarbonAssessment> {
  return assessmentRepository.saveAssessment(userId, data);
}

/**
 * Deletes all carbon assessments for a user.
 * 
 * @param userId - Unique identifier of the user.
 */
export async function deleteAssessments(userId: string): Promise<void> {
  return assessmentRepository.deleteAssessments(userId);
}

/**
 * Retrieves all goals of a user.
 * 
 * @param userId - Unique identifier of the user.
 * @returns List of user's Goals.
 */
export async function getUserGoals(userId: string): Promise<Goal[]> {
  return goalRepository.getUserGoals(userId);
}

/**
 * Adds a new active carbon-reduction goal for the user.
 * 
 * @param userId - Unique identifier of the user.
 * @param data - Details of the goal.
 * @returns Created Goal.
 */
export async function addGoal(
  userId: string, 
  data: { title: string; category: Goal["category"]; co2Reduction: number; difficulty: Goal["difficulty"] }
): Promise<Goal> {
  return goalRepository.addGoal(userId, data);
}

/**
 * Updates an existing user goal status.
 * 
 * @param userId - Unique identifier of the user.
 * @param goalId - Unique identifier of the goal.
 * @param status - The new status.
 * @returns Updated Goal or null.
 */
export async function updateGoal(userId: string, goalId: string, status: "ACTIVE" | "COMPLETED"): Promise<Goal | null> {
  return goalRepository.updateGoal(userId, goalId, status);
}

/**
 * Retrieves all challenges associated with a user.
 * 
 * @param userId - Unique identifier of the user.
 * @returns List of UserChallenges.
 */
export async function getUserChallenges(userId: string): Promise<UserChallenge[]> {
  return challengeRepository.getUserChallenges(userId);
}

/**
 * Joins a weekly community eco-challenge.
 * 
 * @param userId - Unique identifier of the user.
 * @param challengeCode - Unique slug identifying the challenge.
 * @returns Created UserChallenge enrollment.
 */
export async function joinChallenge(userId: string, challengeCode: string): Promise<UserChallenge> {
  return challengeRepository.joinChallenge(userId, challengeCode);
}

/**
 * Completes a user challenge enrollment.
 * 
 * @param userId - Unique identifier of the user.
 * @param enrollmentId - ID of the user's challenge enrollment.
 * @returns Completed UserChallenge.
 */
export async function completeChallenge(userId: string, enrollmentId: string): Promise<UserChallenge> {
  return challengeRepository.completeChallenge(userId, enrollmentId);
}

/**
 * Retrieves unlocked achievements for a user.
 * 
 * @param userId - Unique identifier of the user.
 * @returns List of Achievements.
 */
export async function getUserAchievements(userId: string): Promise<Achievement[]> {
  return userRepository.getUserAchievements(userId);
}

/**
 * Awards a new achievement badge to a user.
 * 
 * @param userId - Unique identifier of the user.
 * @param title - Achievement badge title.
 * @param description - Details of what was accomplished.
 * @param icon - Icon string.
 * @returns Created Achievement record.
 */
export async function addAchievement(userId: string, title: string, description: string, icon: string): Promise<Achievement> {
  return userRepository.addAchievement(userId, title, description, icon);
}
