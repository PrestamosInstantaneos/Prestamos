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

    const { timestamp, cedula, estado } = await req.json()
    if (!timestamp || !cedula || !estado) {
      return NextResponse.json({ message: "Faltan campos obligatorios (timestamp, cedula, estado)." }, { status: 400 })
    }

    // 2. Obtener cliente de Sheets
    const { sheets, sheetId } = getSheetsClient()

    // 3. Buscar la fila exacta del préstamo
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "'Solicitudes'!A:L",
    })

    const rows = response.data.values || []
    let rowIndexToUpdate = -1
    let loanInfo = null

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length < 2) continue

      const rowTimestamp = row[0] ? row[0].toString().trim() : ""
      const rowCedula = row[1] ? row[1].toString().trim().replace(/\D/g, "") : ""
      const cleanTargetCedula = cedula.toString().trim().replace(/\D/g, "")

      if (rowTimestamp === timestamp.toString().trim() && rowCedula === cleanTargetCedula) {
        rowIndexToUpdate = i + 1 // Google Sheets es 1-indexed
        loanInfo = {
          timestamp: row[0] || "",
          cedula: row[1] || "",
          nombres: row[2] || "",
          apellidos: row[3] || "",
          telefono: row[4] || "",
          modalidad: row[5] || "",
          monto: row[6] || "",
          fechas: row[8] || "",
          totalPagar: row[9] || "",
        }
        break
      }
    }

    if (rowIndexToUpdate === -1 || !loanInfo) {
      return NextResponse.json({ message: "No se encontró ningún préstamo coincidente." }, { status: 404 })
    }

    // 4. Actualizar la celda del estado (columna L / índice 11, correspondiente a la columna 12)
    // Usamos el rango 'Solicitudes'!L{row}
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `'Solicitudes'!L${rowIndexToUpdate}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[estado]],
      },
    })

    // 5. Enviar notificación por Telegram si está configurado
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
    const telegramChatId = process.env.TELEGRAM_CHAT_ID

    if (telegramBotToken && telegramChatId) {
      try {
        let statusIcon = "ℹ️"
        if (estado === "Aprobado") statusIcon = "✅"
        else if (estado === "Rechazado") statusIcon = "❌"
        else if (estado === "Pagado") statusIcon = "💰"

        const messageText = `📢 *Actualización de Préstamo* 📢\n\n` +
          `👤 *Cliente:* ${loanInfo.nombres} ${loanInfo.apellidos}\n` +
          `🪪 *Cédula:* ${loanInfo.cedula}\n` +
          `📞 *Teléfono:* ${loanInfo.telefono}\n` +
          `💰 *Monto:* ${loanInfo.monto}\n` +
          `📋 *Modalidad:* ${loanInfo.modalidad}\n` +
          `🗓️ *Fechas:* ${loanInfo.fechas}\n` +
          `💵 *Total a pagar:* ${loanInfo.totalPagar}\n\n` +
          `${statusIcon} *Nuevo Estatus:* \`${estado.toUpperCase()}\`\n` +
          `⚙️ _Actualizado de forma manual por el Administrador._`

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
        console.error("Error al enviar notificación de Telegram en update-loan:", tgError)
      }
    }

    return NextResponse.json({ success: true, message: `Estatus del préstamo actualizado a ${estado} correctamente.` })
  } catch (error: any) {
    console.error("Error al actualizar estatus de préstamo:", error)
    return NextResponse.json(
      { message: error.message || "Error al actualizar la solicitud." },
      { status: 500 }
    )
  }
}
