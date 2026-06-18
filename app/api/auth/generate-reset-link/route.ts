import { google } from "googleapis"
import { NextRequest, NextResponse } from "next/server"
import path from "path"
import fs from "fs"
import crypto from "crypto"
import { verifyToken, normalizePhoneNumber } from "@/lib/auth"

export const runtime = "nodejs"

async function ensureResetTokensSheet(sheets: any, sheetId: string) {
  try {
    await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "'ResetTokens'!A1:A1",
    })
  } catch (error: any) {
    if (error.message && (error.message.includes("not found") || error.message.includes("badRequest") || error.message.includes("does not exist"))) {
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: "ResetTokens",
                  },
                },
              },
            ],
          },
        })
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: "'ResetTokens'!A1:D1",
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [["token", "telefono", "used", "createdAt"]],
          },
        })
      } catch (addError) {
        console.error("Error creating ResetTokens sheet:", addError)
      }
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Validar sesión del administrador
    const adminToken = req.cookies.get("auth_token")?.value
    if (!adminToken) {
      return NextResponse.json({ message: "No autorizado." }, { status: 401 })
    }

    const decoded = await verifyToken(adminToken)
    if (!decoded || normalizePhoneNumber(decoded.telefono) !== "04125654081") {
      return NextResponse.json({ message: "No autorizado. Solo el administrador puede realizar esta acción." }, { status: 403 })
    }

    const { telefono } = await req.json()
    if (!telefono) {
      return NextResponse.json({ message: "El teléfono del cliente es requerido." }, { status: 400 })
    }

    const normalizedClientPhone = normalizePhoneNumber(telefono)

    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) {
      return NextResponse.json({ message: "Configuración incompleta de Google Sheets." }, { status: 500 })
    }

    let auth
    const localCredsFilename = process.env.GOOGLE_SERVICE_ACCOUNT_FILE || "mapsproject-478319-25d1d60bf518.json"
    const credentialsPath = path.join(process.cwd(), localCredsFilename)

    if (fs.existsSync(credentialsPath)) {
      auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      })
    } else {
      const clientEmail = process.env.GOOGLE_CLIENT_EMAIL
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n")
      if (!clientEmail || !privateKey) {
        return NextResponse.json({ message: "Credenciales de Google Sheets no encontradas." }, { status: 500 })
      }
      auth = new google.auth.GoogleAuth({
        credentials: { client_email: clientEmail, private_key: privateKey },
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      })
    }

    const sheets = google.sheets({ version: "v4", auth })

    // Validar que el cliente existe
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "A:P",
    })

    const rows = getResponse.data.values || []
    const userExists = rows.some((row) => {
      if (!row[3]) return false
      return normalizePhoneNumber(row[3].toString()) === normalizedClientPhone
    })

    if (!userExists) {
      return NextResponse.json({ message: "El número de teléfono ingresado no está registrado." }, { status: 404 })
    }

    // Asegurar que existe la pestaña de tokens
    await ensureResetTokensSheet(sheets, sheetId)

    // Generar un token único
    const token = crypto.randomUUID()
    const createdAt = new Date().toISOString()

    // Registrar el token
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "'ResetTokens'!A:D",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[token, normalizedClientPhone, "FALSE", createdAt]],
      },
    })

    const origin = req.nextUrl.origin
    const resetLink = `${origin}/reset-password?token=${token}`

    return NextResponse.json({ success: true, link: resetLink })
  } catch (error: any) {
    console.error("Error en generate-reset-link:", error)
    return NextResponse.json({ message: error.message || "Error interno del servidor." }, { status: 500 })
  }
}
