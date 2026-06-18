import { google } from "googleapis"
import { NextRequest, NextResponse } from "next/server"
import path from "path"
import fs from "fs"
import crypto from "crypto"
import { normalizePhoneNumber } from "@/lib/auth"

export const runtime = "nodejs"

async function ensureResetTokensSheet(sheets: any, sheetId: string) {
  try {
    await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "'ResetTokens'!A1:A1",
    })
  } catch (error: any) {
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
    } catch (addError: any) {
      if (addError.message && addError.message.includes("already exists")) {
        return
      }
      console.error("Error creating ResetTokens sheet:", addError)
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { telefono } = await req.json()
    if (!telefono) {
      return NextResponse.json({ message: "El número de teléfono es requerido." }, { status: 400 })
    }

    const normalizedPhone = normalizePhoneNumber(telefono)

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

    // 1. Validar que el cliente existe y obtener su nombre
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "A:P",
    })

    const rows = getResponse.data.values || []
    const userRow = rows.find((row) => {
      if (!row[3]) return false
      return normalizePhoneNumber(row[3].toString()) === normalizedPhone
    })

    if (!userRow) {
      return NextResponse.json({ message: "El número de teléfono ingresado no está registrado." }, { status: 404 })
    }

    const clientName = `${userRow[0] || ""} ${userRow[1] || ""}`.trim() || "Cliente"

    // 2. Asegurar que existe la pestaña de tokens
    await ensureResetTokensSheet(sheets, sheetId)

    // 3. Generar token único
    const token = crypto.randomUUID()
    const createdAt = new Date().toISOString()

    // 4. Registrar el token
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "'ResetTokens'!A:D",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[token, normalizedPhone, "FALSE", createdAt]],
      },
    })

    const origin = req.nextUrl.origin
    const resetLink = `${origin}/reset-password?token=${token}`

    // 5. Enviar notificación a Telegram
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
    const telegramChatId = process.env.TELEGRAM_CHAT_ID

    if (telegramBotToken && telegramChatId) {
      const waMessage = `Hola, *${clientName}*. Aquí tienes el enlace solicitado para restablecer tu contraseña en RESUELVE YA! (recuerda que es de un solo uso): ${resetLink}`
      const messageText = `🔑 *Nueva Solicitud de Recuperación de Clave* 🔑\n\n` +
        `👤 *Cliente:* ${clientName}\n` +
        `📞 *Teléfono:* ${normalizedPhone}\n\n` +
        `🔗 *Enlace de un solo uso generado:* \n${resetLink}\n\n` +
        `💬 *Copiar mensaje para WhatsApp:* \n\`${waMessage}\``

      await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: messageText,
          parse_mode: "Markdown",
        }),
      })
    }

    return NextResponse.json({ success: true, message: "Ya nos estaremos comunicando con usted." })
  } catch (error: any) {
    console.error("Error en request-reset POST:", error)
    return NextResponse.json({ message: error.message || "Error interno al procesar la solicitud." }, { status: 500 })
  }
}
