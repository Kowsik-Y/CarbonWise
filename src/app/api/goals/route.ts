import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/proxy";
import { 
  getUserGoals, 
  addGoal, 
  updateGoal, 
  getUserProfile, 
  updateUserPoints, 
  addAchievement 
} from "@/services/db-service";
import { z } from "zod";
import { Goal } from "@/types";
import { handleApiError, ValidationError, NotFoundError } from "@/lib/errors";

const createGoalSchema = z.object({
  title: z.string().min(2),
  category: z.enum(["transport", "energy", "food", "shopping", "waste"]),
  co2Reduction: z.number().min(0),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

const updateGoalSchema = z.object({
  id: z.string(),
  status: z.enum(["ACTIVE", "COMPLETED"]),
});

export const GET = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const goals = await getUserGoals(userId);

    return NextResponse.json({ goals });
  } catch (error) {
    return handleApiError(error);
  }
});

export const POST = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const body = await req.json();
    const validation = createGoalSchema.safeParse(body);

    if (!validation.success) {
      throw new ValidationError("Invalid goal parameters");
    }

    const { title, category, co2Reduction, difficulty } = validation.data;

    // Limit active goals to 10
    const goalsList = await getUserGoals(userId);
    const activeCount = goalsList.filter((g: Goal) => g.status === "ACTIVE").length;

    if (activeCount >= 10) {
      throw new ValidationError("You can have a maximum of 10 active goals. Complete some first!");
    }

    const goal = await addGoal(userId, {
      title,
      category,
      co2Reduction,
      difficulty,
    });

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
});

export const PATCH = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const body = await req.json();
    const validation = updateGoalSchema.safeParse(body);

    if (!validation.success) {
      throw new ValidationError("Invalid request payload");
    }

    const { id, status } = validation.data;

    const goalsList = await getUserGoals(userId);
    const goal = goalsList.find((g: Goal) => g.id === id);

    if (!goal) {
      throw new NotFoundError("Goal not found");
    }

    if (goal.status === "COMPLETED" && status === "COMPLETED") {
      throw new ValidationError("Goal is already completed");
    }

    const updatedGoal = await updateGoal(userId, id, status);

    let pointsAwarded = 0;
    if (status === "COMPLETED") {
      // Award points based on difficulty
      if (goal.difficulty === "easy") pointsAwarded = 50;
      else if (goal.difficulty === "medium") pointsAwarded = 100;
      else if (goal.difficulty === "hard") pointsAwarded = 200;

      // Update user points
      const user = await getUserProfile(userId);
      if (user) {
        const newPoints = user.points + pointsAwarded;
        let newLevel = user.level;
        if (newPoints >= 1000) newLevel = 4;
        else if (newPoints >= 500) newLevel = 3;
        else if (newPoints >= 200) newLevel = 2;

        await updateUserPoints(userId, newPoints, newLevel);

        // Unlock achievement for first completed goal
        const listAfterUpdate = await getUserGoals(userId);
        const completedCount = listAfterUpdate.filter((g: Goal) => g.status === "COMPLETED").length;

        if (completedCount === 1) {
          await addAchievement(userId, "First Steps", "Successfully completed your first reduction goal", "target");
        } else if (completedCount === 5) {
          await addAchievement(userId, "Eco Warrior", "Successfully completed 5 reduction goals", "award");
        }
      }
    }

    return NextResponse.json({ goal: updatedGoal, pointsAwarded });
  } catch (error) {
    return handleApiError(error);
  }
});
