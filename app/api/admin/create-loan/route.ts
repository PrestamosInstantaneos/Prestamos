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
      cedula,
      nombres,
      apellidos,
      telefono,
      modalidad,
      monto,
      montoCuota,
      fechas,
      totalPagar,
      bcvRate,
      estado,
    } = await req.json()

    if (!cedula || !nombres || !apellidos || !telefono || !modalidad || !monto || !totalPagar) {
      return NextResponse.json({ message: "Faltan campos obligatorios para registrar el préstamo." }, { status: 400 })
    }

    // 2. Obtener cliente de Sheets
    const { sheets, sheetId } = getSheetsClient()

    // 3. Agregar el registro de préstamo manual
    const timestamp = new Date().toLocaleString("es-VE", { timeZone: "America/Caracas" })
    
    const formattedMonto = typeof monto === "number" ? `Bs. ${monto.toLocaleString("es-VE")}` : monto
    const formattedTotalPagar = typeof totalPagar === "number" ? `Bs. ${totalPagar.toLocaleString("es-VE")}` : totalPagar
    const formattedBcvRate = typeof bcvRate === "number" ? `Bs. ${bcvRate.toLocaleString("es-VE")}` : bcvRate
    const formattedMontoCuota = montoCuota 
      ? (typeof montoCuota === "number" ? `Bs. ${montoCuota.toLocaleString("es-VE")}` : montoCuota) 
      : (modalidad === "Cuotas" ? "A calcular" : "N/A")

    const finalEstado = estado || "Aprobado"

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "'Solicitudes'!A:L",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            timestamp,
            cedula.trim(),
            nombres.trim(),
            apellidos.trim(),
            normalizePhoneNumber(telefono),
            modalidad,
            formattedMonto,
            formattedMontoCuota,
            fechas,
            formattedTotalPagar,
            formattedBcvRate,
            finalEstado,
          ]
        ],
      },
    })

    // 4. Enviar notificación por Telegram si está configurado
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
    const telegramChatId = process.env.TELEGRAM_CHAT_ID

    if (telegramBotToken && telegramChatId) {
      try {
        const estatusIcon = finalEstado === "Aprobado" ? "✅" : (finalEstado === "Pagado" ? "💰" : "ℹ️")
        const messageText = `⚙️ *Préstamo Registrado Manualmente por Admin* ⚙️\n\n` +
          `👤 *Cliente:* ${nombres.trim()} ${apellidos.trim()}\n` +
          `🪪 *Cédula:* ${cedula.trim()}\n` +
          `📞 *Teléfono:* ${normalizePhoneNumber(telefono)}\n` +
          `📋 *Modalidad:* ${modalidad}\n` +
          `💰 *Monto:* ${formattedMonto}\n` +
          `🗓️ *Fechas de Pago:* ${fechas}\n` +
          `💵 *Total a pagar:* ${formattedTotalPagar}\n` +
          `💱 *Tasa BCV:* ${formattedBcvRate}\n\n` +
          `${estatusIcon} *Estatus Inicial:* \`${finalEstado.toUpperCase()}\`\n` +
          `⏰ *Fecha/Hora:* ${timestamp}`

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
        console.error("Error al enviar notificación de Telegram en create-loan:", tgError)
      }
    }

    return NextResponse.json({ success: true, message: "Préstamo registrado manualmente con éxito." })
  } catch (error: any) {
    console.error("Error al registrar préstamo manualmente:", error)
    return NextResponse.json(
      { message: error.message || "Error al procesar el registro manual del préstamo." },
      { status: 500 }
    )
  }
}
