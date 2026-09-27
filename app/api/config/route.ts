import { NextResponse } from "next/server";
import { readSiteSettings } from "@/lib/site-settings";

export async function GET() {
  return NextResponse.json(await readSiteSettings());
}
