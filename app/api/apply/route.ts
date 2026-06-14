import { google } from "googleapis"
import { NextResponse } from "next/server"
import path from "path"
import fs from "fs"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const { nombres, apellidos, cedula, telefono, monto, modalidad, fechas, bcvRate, totalPagar, montoCuota } = await req.json()

    // Validación básica de campos
    if (!nombres || !apellidos || !cedula || !telefono || !modalidad) {
      return NextResponse.json(
        { message: "Todos los campos obligatorios son requeridos." },
        { status: 400 }
      )
    }

    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) {
      console.error("Falta la variable de entorno GOOGLE_SHEET_ID")
      return NextResponse.json(
        { message: "Error de configuración: falta GOOGLE_SHEET_ID." },
        { status: 500 }
      )
    }

    let auth

    // Verificar si existe el archivo de credenciales localmente
    const localCredsFilename = process.env.GOOGLE_SERVICE_ACCOUNT_FILE || "mapsproject-478319-25d1d60bf518.json"
    const credentialsPath = path.join(/*turbopackIgnore: true*/ process.cwd(), localCredsFilename)

    if (fs.existsSync(credentialsPath)) {
      auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      })
    } else {
      // Como alternativa, intentamos usar variables de entorno (útil para despliegue en Vercel)
      const clientEmail = process.env.GOOGLE_CLIENT_EMAIL
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n")

      if (!clientEmail || !privateKey) {
        console.error("No se encontró el archivo de credenciales local ni las variables de entorno de Google Auth")
        return NextResponse.json(
          { message: "Error de configuración: Credenciales de Google Sheets no encontradas." },
          { status: 500 }
        )
      }

      auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      })
    }

    const sheets = google.sheets({ version: "v4", auth })

    // Agrega la fila a la hoja de cálculo en "Solicitudes" (rango 'Solicitudes'!A:L)
    const timestamp = new Date().toLocaleString("es-VE", { timeZone: "America/Caracas" })
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "'Solicitudes'!A:L",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            timestamp,
            cedula,
            nombres,
            apellidos,
            telefono,
            modalidad,
            typeof monto === "number" ? `Bs. ${monto.toLocaleString("es-VE")}` : monto,
            montoCuota ? `Bs. ${montoCuota.toLocaleString("es-VE")}` : (modalidad === "Cuotas" ? "A calcular" : "N/A"),
            fechas,
            typeof totalPagar === "number" ? `Bs. ${totalPagar.toLocaleString("es-VE")}` : totalPagar,
            typeof bcvRate === "number" ? `Bs. ${bcvRate.toLocaleString("es-VE")}` : bcvRate,
            "Pendiente",
          ]
        ],
      },
    })

    // Enviar notificación a Telegram si está configurado
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
    const telegramChatId = process.env.TELEGRAM_CHAT_ID

    if (telegramBotToken && telegramChatId) {
      try {
        const fechaHoy = timestamp.split(",")[0]
        const montoStr = typeof monto === "number" ? `Bs. ${monto.toLocaleString("es-VE")}` : monto
        const totalPagarStr = typeof totalPagar === "number" ? `Bs. ${totalPagar.toLocaleString("es-VE")}` : totalPagar

        const cuotaStr = montoCuota 
          ? `Bs. ${montoCuota.toLocaleString("es-VE")}` 
          : (modalidad === "Cuotas" && typeof totalPagar === "number" ? `Bs. ${(totalPagar / 2).toLocaleString("es-VE")}` : null)
        const modalidadDisplay = modalidad + (cuotaStr ? ` (2 cuotas de ${cuotaStr})` : "")

        const whatsappTemplate = `👋 ¡Hola, *${nombres} ${apellidos}*!\n` +
          `Mi nombre es *Isaac Canache*, operador de *ResuelveYa!* 🌟\n\n` +
          `He recibido su solicitud de préstamo realizada el día de hoy (*${fechaHoy}*):\n\n` +
          `💰 *Monto:* ${montoStr}\n` +
          `📋 *Modalidad:* ${modalidadDisplay}\n` +
          `🗓️ *Fecha(s) de pago:* ${fechas}\n` +
          `💵 *Total a pagar:* ${totalPagarStr}\n\n` +
          `¿Me podría confirmar si sus datos para el desembolso son:\n` +
          `👤 *Titular:* ${nombres} ${apellidos}\n` +
          `🪪 *Cédula:* ${cedula}\n` +
          `📞 *Teléfono:* ${telefono}?\n\n` +
          `¡Quedo atento a su confirmación para proceder con la operación y enviarle su comprobante! 👍⚡`

        const messageText = `🔔 *Nueva Solicitud de Préstamo* 🔔\n\n` +
          `👤 *Cliente:* ${nombres} ${apellidos}\n` +
          `🪪 *Cédula:* ${cedula}\n` +
          `📞 *Teléfono:* ${telefono}\n` +
          `📋 *Modalidad:* ${modalidadDisplay}\n` +
          `💰 *Monto:* ${montoStr}\n` +
          `🗓️ *Fechas:* ${fechas}\n` +
          `💵 *Total a pagar:* ${totalPagarStr}\n` +
          `💱 *Tasa BCV:* Bs. ${typeof bcvRate === 'number' ? bcvRate.toLocaleString("es-VE") : bcvRate}\n` +
          `⏰ *Fecha/Hora:* ${timestamp}\n\n` +
          `💬 *Mensaje para WhatsApp (Toca para copiar):*\n` +
          `\`\`\`\n${whatsappTemplate}\n\`\`\``;


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
        });
      } catch (tgError) {
        console.error("Error al enviar notificación de Telegram:", tgError)
      }
    }


    return NextResponse.json({ success: true, data: response.data })
  } catch (error: any) {
    console.error("Error al escribir en Google Sheets:", error)
    return NextResponse.json(
      { message: error.message || "Error al procesar y guardar la solicitud." },
      { status: 500 }
    )
  }
}

