import { getGoal, isGoalCompleted } from "@/lib/contracts/savings-goal";
import { NextResponse, NextRequest } from "next/server";

import { withApiLogging } from '@/lib/api-logging';
export const GET = withApiLogging(async async 
  req: NextRequest,
  context: { params: Promise<{ id: string }> } // ← note Promise
) {
  try {
    const { id } = await context.params;

    const publicKey = req.headers.get("x-public-key");

    if (!publicKey) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const goal = await getGoal(id);

    if (!goal) {
      return NextResponse.json(
        { error: "Goal not found" },
        { status: 404 }
      );
    }

    const completed = await isGoalCompleted(id);

    return NextResponse.json({ completed }, { status: 200 });
  } catch (error) {
    console.error(`GET /api/goals/${await context.params}/completed error:`, error);
    return NextResponse.json(
      { error: "Failed to check goal status" },
      { status: 500 }
    );
  }
}