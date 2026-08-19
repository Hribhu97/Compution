import { NextResponse } from "next/server";
import { searchBirds } from "@/lib/data-provider";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";

  const results = await searchBirds(q);
  return NextResponse.json(results);
}
