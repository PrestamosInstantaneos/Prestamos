import { NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { verifyToken } from "@/lib/auth"
import path from "path"
import fs from "fs"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value

    if (!token) {
      return NextResponse.json({ loans: [] }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded || !decoded.telefono) {
      return NextResponse.json({ loans: [] }, { status: 401 })
    }

    const userPhone = decoded.telefono

    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) {
      return NextResponse.json({ loans: [] })
    }

    let auth
    const localCredsFilename = process.env.GOOGLE_SERVICE_ACCOUNT_FILE || "mapsproject-478319-25d1d60bf518.json"
    const credentialsPath = path.join(/*turbopackIgnore: true*/ process.cwd(), localCredsFilename)

    if (fs.existsSync(credentialsPath)) {
      auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      })
    } else {
      const clientEmail = process.env.GOOGLE_CLIENT_EMAIL
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n")

      if (!clientEmail || !privateKey) {
        return NextResponse.json({ loans: [] })
      }

      auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      })
    }

    const sheets = google.sheets({ version: "v4", auth })

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "'Hoja 2'!A:L",
    })

    const rows = response.data.values || []
    if (rows.length === 0) {
      return NextResponse.json({ loans: [] })
    }

    // Filtrar solicitudes correspondientes al teléfono del usuario
    const userLoans = rows
      .filter((row) => {
        if (!row[4]) return false
        const normalizedRowPhone = row[4].toString().replace(/\D/g, "")
        const normalizedUserPhone = userPhone.replace(/\D/g, "")
        // Coincidencia de número de teléfono
        return normalizedRowPhone === normalizedUserPhone
      })
      .map((row) => {
        return {
          fechaRegistro: row[0] || "",
          modalidad: row[5] || "",
          monto: row[6] || "",
          montoCuota: row[7] || "",
          fechasPago: row[8] || "",
          totalPagar: row[9] || "",
          estado: row[11] || "Pendiente",
        }
      })

    // Solo devolver préstamos que no estén completados (no pagados ni rechazados)
    const pendingLoans = userLoans.filter(
      (loan) =>
        loan.estado.toLowerCase() !== "pagado" &&
        loan.estado.toLowerCase() !== "rechazado"
    )

    return NextResponse.json({ loans: pendingLoans })
  } catch (error) {
    console.error("Error al obtener préstamos del usuario:", error)
    return NextResponse.json({ loans: [] }, { status: 500 })
  }
}
