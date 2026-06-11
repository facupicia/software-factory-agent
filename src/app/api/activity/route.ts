import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// GET /api/activity — list activity log, optional ?task_id= filter
export async function GET(request: Request) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("task_id");

    let query = supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (taskId) {
      query = query.eq("task_id", taskId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
