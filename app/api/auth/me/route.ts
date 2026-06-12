import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value

    if (!token) {
      return NextResponse.json(
        { user: null },
        { status: 401 }
      )
    }

    const decoded = await verifyToken(token)

    if (!decoded) {
      return NextResponse.json(
        { user: null },
        { status: 401 }
      )
    }

    return NextResponse.json({
      user: decoded,
    })
  } catch (error) {
    console.error("Error al verificar la sesión:", error)
    return NextResponse.json(
      { user: null },
      { status: 500 }
    )
  }
}
