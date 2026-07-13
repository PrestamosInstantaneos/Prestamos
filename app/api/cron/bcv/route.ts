import { revalidateTag } from "next/cache"
import { NextResponse } from "next/server"
import { BCV_RATE_TAG, getBcvRate } from "@/lib/bcv"
import { getSheetsClient } from "@/lib/google-sheets"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const cleanNumFormat = (str: any) => {
  if (!str) return "0"
  const parsed = parseFloat(str.toString().replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")) || 0
  return parsed.toLocaleString("es-VE", { minimumFractionDigits: 0 })
}

function isSameDay(dateStr: string, today: Date): boolean {
  if (!dateStr) return false
  const dates = dateStr.split(",").map((d) => d.trim())
  
  const todayDay = today.getDate()
  const todayMonth = today.getMonth()
  const todayYear = today.getFullYear()
  
  return dates.some((d) => {
    const clean = d.replace(/[^\d/]/g, "")
    const parts = clean.split("/")
    if (parts.length < 2) return false
    
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1
    
    let year = todayYear
    if (parts.length >= 3) {
      year = parseInt(parts[2], 10)
      if (year < 100) year += 2000
      if (year === 2025) year = 2026
    }
    
    return day === todayDay && month === todayMonth && year === todayYear
  })
}

/**
 * Endpoint que ejecuta el Cron de Vercel cada mañana.
 * Invalida la cache, vuelve a consultar el BCV y envía notificaciones
 * de los préstamos vencidos/por cobrar en el día de hoy por Telegram.
 */
export async function GET(request: Request) {
  // Verificación opcional del secreto del cron (Vercel envía este header).
  const authHeader = request.headers.get("authorization")
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  // 1. Invalida la cache y fuerza una nueva consulta del BCV.
  revalidateTag(BCV_RATE_TAG, "max")
  const rate = await getBcvRate()

  // 2. Consultar préstamos vencidos hoy
  const notifiedLoans: any[] = []
  try {
    const { sheets, sheetId } = getSheetsClient()
    const [loansRes, manualRes] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: "'Solicitudes'!A:P",
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: "'Carga manual'!A:L",
      })
    ])

    const loanRows = loansRes.data.values || []
    const manualRows = manualRes.data.values || []

    const loans = loanRows
      .filter((row) => row && row[1] && row[1].toString().toLowerCase() !== "cédula" && row[0].toString().toLowerCase() !== "timestamp")
      .map((row) => ({
        timestamp: row[0] || "",
        cedula: row[1] || "",
        nombres: row[2] || "",
        apellidos: row[3] || "",
        telefono: row[4] || "",
        modalidad: row[5] || "",
        monto: row[6] || "",
        fechas: row[8] || "",
        totalPagar: row[9] || "",
        estado: row[11] || "Pendiente",
      }))

    let lastSeenName = ""
    const manualLoans = manualRows
      .filter((row, idx) => idx > 0 && row && (row[0] || row[1] || row[2]))
      .map((row) => {
        let name = (row[0] || "").toString().trim()
        if (name) {
          lastSeenName = name
        } else {
          name = lastSeenName
        }

        return {
          solicitante: name,
          estado: row[1] || "Pendiente",
          montoSolicitado: row[2] || "0",
          deuda: row[3] || "0",
          fechaSolicitud: row[4] || "",
          modalidad: row[5] || "",
          fechaPago: row[6] || "",
          telefono: row[4] || "WhatsApp",
        }
      })

    // Fecha actual en huso horario de Venezuela (UTC-4)
    const now = new Date()
    const venTime = new Date(now.getTime() + (now.getTimezoneOffset() - 240) * 60000)
    const formattedTodayStr = venTime.toLocaleDateString("es-VE")

    const dueLoans: any[] = []

    // Préstamos Web
    loans.forEach((l) => {
      const state = l.estado.toLowerCase()
      const isPending = state === "aprobado" || state === "por pagar" || state === "pendiente por pagar" || state === "pagando"
      if (isPending && isSameDay(l.fechas, venTime)) {
        dueLoans.push({
          source: "Web",
          nombre: `${l.nombres} ${l.apellidos}`.trim(),
          cedula: l.cedula,
          telefono: l.telefono,
          monto: l.monto,
          deuda: l.totalPagar,
          fechaPago: formattedTodayStr
        })
      }
    })

    // Préstamos Manuales (Carga Manual)
    manualLoans.forEach((ml) => {
      const state = ml.estado.toLowerCase()
      const isPending = state === "aprobado" || state === "por pagar" || state === "pendiente por pagar" || state === "pagando"
      if (isPending && isSameDay(ml.fechaPago, venTime)) {
        dueLoans.push({
          source: "Carga Manual",
          nombre: ml.solicitante,
          cedula: "Manual",
          telefono: ml.telefono,
          monto: ml.montoSolicitado.toString().includes("Bs") || ml.montoSolicitado.toString().includes("$") ? ml.montoSolicitado : `Bs. ${cleanNumFormat(ml.montoSolicitado)}`,
          deuda: ml.deuda.toString().includes("Bs") || ml.deuda.toString().includes("$") ? ml.deuda : `Bs. ${cleanNumFormat(ml.deuda)}`,
          fechaPago: formattedTodayStr
        })
      }
    })

    // Enviar notificaciones a Telegram
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
    const telegramChatId = process.env.TELEGRAM_CHAT_ID

    if (telegramBotToken && telegramChatId && dueLoans.length > 0) {
      for (const loan of dueLoans) {
        const messageText = `🔔 *Recordatorio de Cobro para Hoy* 🔔\n\n` +
          `👤 *Cliente:* ${loan.nombre}\n` +
          `🪪 *Cédula:* ${loan.cedula}\n` +
          `📞 *Teléfono:* ${loan.telefono}\n` +
          `💰 *Monto Solicitado:* ${loan.monto}\n` +
          `💵 *Deuda Pendiente:* ${loan.deuda}\n` +
          `🗓️ *Fecha de Vencimiento:* ${loan.fechaPago}\n` +
          `Origen: \`${loan.source}\`\n\n` +
          `⚠️ _Por favor, contactar al cliente para gestionar el pago correspondiente._`

        try {
          await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: messageText,
              parse_mode: "Markdown",
            }),
          })
          notifiedLoans.push(loan)
          // Esperar 150ms para respetar limites
          await new Promise((resolve) => setTimeout(resolve, 150))
        } catch (tgError) {
          console.error("Error al enviar recordatorio de Telegram:", tgError)
        }
      }
    }
  } catch (error: any) {
    console.error("Error al ejecutar cron de recordatorio de cobros:", error)
  }

  return NextResponse.json({
    ok: true,
    refreshedAt: new Date().toISOString(),
    rate,
    notifiedLoansCount: notifiedLoans.length,
    notifiedLoans
  })
}
