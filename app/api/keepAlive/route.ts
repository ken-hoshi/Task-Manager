import { NextResponse } from "next/server";
import { clientSupabase } from "@/app/lib/supabase/client";

// ビルドのときに結果を固めず、呼ばれるたびに DB に問い合わせる
export const dynamic = "force-dynamic";

// Vercel Cron が毎日呼ぶ（vercel.json）。無料プランの Supabase が使われずに自動で止まるのを防ぐ
export async function GET() {
  const { data, error } = await clientSupabase.rpc("keep_alive");

  if (error) {
    console.error("Keep alive:", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true, statuses: data });
}
