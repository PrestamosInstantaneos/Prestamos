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

    const { telefono, verificado, verificacionMotivo } = await req.json()
    if (!telefono || !verificado) {
      return NextResponse.json({ message: "Faltan campos obligatorios (telefono, verificado)." }, { status: 400 })
    }

    // 2. Obtener cliente de Sheets
    const { sheets, sheetId } = getSheetsClient()

    // 3. Buscar el usuario por número de teléfono
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "A:Q",
    })

    const rows = response.data.values || []
    let rowIndexToUpdate = -1
    let userInfo = null

    const targetPhoneClean = normalizePhoneNumber(telefono)

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row || !row[3]) continue

      const rowPhoneClean = normalizePhoneNumber(row[3].toString())

      if (rowPhoneClean === targetPhoneClean) {
        rowIndexToUpdate = i + 1 // Google Sheets es 1-indexed
        userInfo = {
          nombres: row[0] || "",
          apellidos: row[1] || "",
          cedula: row[2] || "",
          telefono: row[3] || "",
        }
        break
      }
    }

    if (rowIndexToUpdate === -1 || !userInfo) {
      return NextResponse.json({ message: "No se encontró ningún usuario con ese número de teléfono." }, { status: 404 })
    }

    // 4. Actualizar Columnas O (15 / índice 14) y P (16 / índice 15)
    // El rango será A{row}:Q{row} o específicamente actualizar celdas individuales.
    // Para simplificar, actualizamos el rango O{row}:P{row} con dos valores.
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `O${rowIndexToUpdate}:P${rowIndexToUpdate}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[verificado, verificacionMotivo || ""]],
      },
    })

    // 5. Enviar notificación por Telegram si está configurado
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
    const telegramChatId = process.env.TELEGRAM_CHAT_ID

    if (telegramBotToken && telegramChatId) {
      try {
        const estatusIcon = verificado === "VERIFICADA" ? "✅" : "⚠️"
        const messageText = `👤 *Actualización de Verificación de Usuario* 👤\n\n` +
          `📝 *Nombre:* ${userInfo.nombres} ${userInfo.apellidos}\n` +
          `🪪 *Cédula:* ${userInfo.cedula}\n` +
          `📞 *Teléfono:* ${userInfo.telefono}\n\n` +
          `${estatusIcon} *Nuevo Estatus:* \`${verificado}\`\n` +
          `💬 *Motivo/Comentarios:* \n${verificacionMotivo || "N/A"}\n\n` +
          `⚙️ _Modificado manualmente por el Administrador._`

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
        console.error("Error al enviar notificación de Telegram en update-user:", tgError)
      }
    }

    return NextResponse.json({ success: true, message: `Usuario verificado a ${verificado} exitosamente.` })
  } catch (error: any) {
    console.error("Error al actualizar estatus de verificación de usuario:", error)
    return NextResponse.json(
      { message: error.message || "Error al actualizar la verificación del usuario." },
      { status: 500 }
    )
  }
}
