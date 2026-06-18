import { google } from "googleapis"
import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import path from "path"
import fs from "fs"
import { normalizePhoneNumber } from "@/lib/auth"

export const runtime = "nodejs"

// GET: Validar si el token es válido y obtener el teléfono asociado
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ valid: false, message: "Token requerido." }, { status: 400 })
    }

    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) {
      return NextResponse.json({ valid: false, message: "Configuración de Google Sheets incompleta." }, { status: 500 })
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
        return NextResponse.json({ valid: false, message: "Credenciales de Google Sheets no encontradas." }, { status: 500 })
      }
      auth = new google.auth.GoogleAuth({
        credentials: { client_email: clientEmail, private_key: privateKey },
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      })
    }

    const sheets = google.sheets({ version: "v4", auth })

    // Leer la lista de tokens
    let getResponse
    try {
      getResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: "'ResetTokens'!A:D",
      })
    } catch (sheetError) {
      return NextResponse.json({ valid: false, message: "El token no es válido o ha expirado." })
    }

    const rows = getResponse.data.values || []
    if (rows.length <= 1) {
      return NextResponse.json({ valid: false, message: "No se encontraron registros de tokens." })
    }

    // Buscar el token
    const tokenRow = rows.find((row, idx) => {
      if (idx === 0) return false // Saltar cabecera
      return row[0] === token
    })

    if (!tokenRow) {
      return NextResponse.json({ valid: false, message: "El token no es válido." })
    }

    const used = tokenRow[2] === "TRUE"
    if (used) {
      return NextResponse.json({ valid: false, message: "Este enlace de restablecimiento ya ha sido utilizado." })
    }

    return NextResponse.json({ valid: true, telefono: tokenRow[1] })
  } catch (error: any) {
    console.error("Error en reset-password GET:", error)
    return NextResponse.json({ valid: false, message: error.message || "Error interno del servidor." }, { status: 500 })
  }
}

// POST: Actualizar la contraseña del usuario e inhabilitar el token
export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json()

    if (!token || !newPassword) {
      return NextResponse.json({ message: "Token y nueva contraseña son requeridos." }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ message: "La contraseña debe tener al menos 6 caracteres." }, { status: 400 })
    }

    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) {
      return NextResponse.json({ message: "Configuración de Google Sheets incompleta." }, { status: 500 })
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

    // 1. Validar el token y obtener el teléfono
    const tokensResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "'ResetTokens'!A:D",
    })

    const tokenRows = tokensResponse.data.values || []
    const tokenIdx = tokenRows.findIndex((row, idx) => {
      if (idx === 0) return false
      return row[0] === token
    })

    if (tokenIdx === -1) {
      return NextResponse.json({ message: "El token no es válido o ha expirado." }, { status: 400 })
    }

    const tokenRow = tokenRows[tokenIdx]
    const used = tokenRow[2] === "TRUE"
    if (used) {
      return NextResponse.json({ message: "Este enlace de restablecimiento ya ha sido utilizado." }, { status: 400 })
    }

    const targetPhone = tokenRow[1]
    const normalizedPhone = normalizePhoneNumber(targetPhone)

    // 2. Buscar el usuario en la hoja principal de usuarios
    const usersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "A:P",
    })

    const userRows = usersResponse.data.values || []
    const userIdx = userRows.findIndex((row) => {
      if (!row[3]) return false
      return normalizePhoneNumber(row[3].toString()) === normalizedPhone
    })

    if (userIdx === -1) {
      return NextResponse.json({ message: "El usuario asociado a este token no fue encontrado." }, { status: 404 })
    }

    const userRowNumber = userIdx + 1 // 1-indexed para sheets

    // 3. Cifrar la nueva contraseña
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)

    // 4. Actualizar la contraseña en la columna G del usuario (G = columna 7)
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `G${userRowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[hashedPassword]],
      },
    })

    // 5. Marcar el token como usado ("TRUE") en la pestaña ResetTokens (C = columna 3)
    const tokenRowNumber = tokenIdx + 1
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `'ResetTokens'!C${tokenRowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [["TRUE"]],
      },
    })

    return NextResponse.json({ success: true, message: "Contraseña actualizada exitosamente." })
  } catch (error: any) {
    console.error("Error en reset-password POST:", error)
    return NextResponse.json({ message: error.message || "Error interno del servidor." }, { status: 500 })
  }
}
