import { NextRequest, NextResponse } from "next/server"
import { verifyToken, normalizePhoneNumber } from "@/lib/auth"
import { getSheetsClient } from "@/lib/google-sheets"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    // 1. Validar sesión del administrador
    const token = req.cookies.get("auth_token")?.value
    if (!token) {
      return NextResponse.json({ message: "No autorizado." }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded || normalizePhoneNumber(decoded.telefono) !== "04125654081") {
      return NextResponse.json({ message: "No autorizado. Acceso denegado." }, { status: 403 })
    }

    const {
      nombres,
      apellidos,
      cedula,
      telefono,
      profesion,
      diasCobro,
      trabajando,
      ciudad,
      municipio,
      calle,
      referencias,
    } = await req.json()

    if (!nombres || !apellidos || !cedula || !telefono) {
      return NextResponse.json({ message: "Los campos nombres, apellidos, cédula y teléfono son obligatorios." }, { status: 400 })
    }

    const normalizedPhone = normalizePhoneNumber(telefono)

    // 2. Obtener cliente de Sheets
    const { sheets, sheetId } = getSheetsClient()

    // 3. Verificar si el teléfono ya existe en la hoja de cálculo
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "A:Q",
    })

    const rows = getResponse.data.values || []
    const userExists = rows.some((row) => {
      if (!row[3]) return false
      return normalizePhoneNumber(row[3].toString()) === normalizedPhone
    })

    if (userExists) {
      return NextResponse.json(
        { message: "El número de teléfono ya se encuentra registrado." },
        { status: 409 }
      )
    }

    const timestamp = new Date().toISOString()

    // 4. Insertar el registro en la Google Sheet (17 columnas)
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "A:Q",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            nombres.trim(),
            apellidos.trim(),
            cedula.trim(),
            normalizedPhone,
            (profesion || "N/A").trim(),
            (diasCobro || "N/A").trim(),
            "WHATSAPP_USER", // Password hash placeholder
            timestamp,
            (trabajando || "N/A").trim(),
            (ciudad || "N/A").trim(),
            (municipio || "N/A").trim(),
            (calle || "N/A").trim(),
            (referencias || "N/A").trim(),
            "WhatsApp - Sin Cédula", // DriveLink
            "WHATSAPP", // Verificado (Establece la clasificación de WhatsApp)
            "Registrado manualmente desde WhatsApp por Administrador", // Motivo
            "N/A", // RostroDriveLink
          ],
        ],
      },
    })

    // 5. Enviar notificación por Telegram si está configurado
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
    const telegramChatId = process.env.TELEGRAM_CHAT_ID

    if (telegramBotToken && telegramChatId) {
      try {
        const messageText = `👤 *Nuevo Cliente de WhatsApp Registrado* 👤\n\n` +
          `📝 *Nombre:* ${nombres.trim()} ${apellidos.trim()}\n` +
          `🪪 *Cédula:* ${cedula.trim()}\n` +
          `📞 *Teléfono:* ${normalizedPhone}\n` +
          `💼 *Trabaja:* ${trabajando || "N/A"}\n` +
          `📍 *Ubicación:* ${ciudad || "N/A"}, ${municipio || "N/A"}\n\n` +
          `ℹ️ *Estatus:* \`WHATSAPP (Registrado por Admin)\``

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
      } catch (tgError) {
        console.error("Error al enviar notificación de Telegram en create-user:", tgError)
      }
    }

    return NextResponse.json({ success: true, message: "Cliente de WhatsApp registrado exitosamente." })
  } catch (error: any) {
    console.error("Error en el registro del cliente de WhatsApp:", error)
    return NextResponse.json(
      { message: error.message || "Error al procesar el registro del cliente." },
      { status: 500 }
    )
  }
}
