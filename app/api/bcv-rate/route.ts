import { NextResponse } from "next/server"
import { getBcvRate } from "@/lib/bcv"

export const runtime = "nodejs"

export async function GET() {
  const rate = await getBcvRate()
  console.log("API BCV Rate:", rate) // Añadido para depuración
  return NextResponse.json(rate)
}