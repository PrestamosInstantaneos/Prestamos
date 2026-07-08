import { NextRequest, NextResponse } from "next/server"
import { verifyToken, normalizePhoneNumber } from "@/lib/auth"
import { getSheetsClient } from "@/lib/google-sheets"
import { getBcvRate } from "@/lib/bcv"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
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

    const { sheets, sheetId } = getSheetsClient()

    // 2. Verificar si la hoja "Historial_Dolar" existe, si no, crearla e inicializarla
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    })
    const sheetsList = spreadsheet.data.sheets || []
    const hasHistorySheet = sheetsList.some((s) => s.properties?.title === "Historial_Dolar")

    if (!hasHistorySheet) {
      // Crear hoja
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: "Historial_Dolar",
                },
              },
            },
          ],
        },
      })

      // Inicializar con cabecera y datos históricos simulados (últimos 7 días anteriores)
      const mockHistory = [
        ["Fecha", "Tasa (Bs.)", "Variacion Bs.", "Variacion %"],
        ["2026-07-01", "39.80", "0.00", "0.00%"],
        ["2026-07-02", "39.85", "0.05", "0.13%"],
        ["2026-07-03", "39.90", "0.05", "0.13%"],
        ["2026-07-04", "39.92", "0.02", "0.05%"],
        ["2026-07-05", "39.92", "0.00", "0.00%"],
        ["2026-07-06", "39.98", "0.06", "0.15%"],
        ["2026-07-07", "40.02", "0.04", "0.10%"],
      ]

      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: "'Historial_Dolar'!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: mockHistory,
        },
      })
    }

    // 3. Obtener los valores del historial
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "'Historial_Dolar'!A:D",
    })

    const rows = getResponse.data.values || []
    const historyData = rows.slice(1) // Omitir cabecera

    // 4. Obtener tasa actual del BCV
    const bcvRateData = await getBcvRate()
    const currentRate = bcvRateData.usd
    const todayStr = new Date().toISOString().split("T")[0]

    // Verificar si ya está registrada la tasa de hoy
    const isTodayLogged = historyData.some((row) => row[0] === todayStr)

    if (!isTodayLogged && historyData.length > 0) {
      const lastRow = historyData[historyData.length - 1]
      const lastRate = parseFloat(lastRow[1])
      const diffBs = currentRate - lastRate
      const diffPct = (diffBs / lastRate) * 100

      // Registrar tasa de hoy
      const newRow = [
        todayStr,
        currentRate.toFixed(4),
        diffBs.toFixed(4),
        `${diffPct.toFixed(2)}%`,
      ]

      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: "'Historial_Dolar'!A:D",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [newRow],
        },
      })

      historyData.push(newRow)
    }

    // 5. Análisis y Proyecciones
    // Re-leer para asegurar que tenemos los datos frescos
    const finalHistory = historyData.map((row) => ({
      fecha: row[0] || "",
      tasa: parseFloat(row[1]) || 0,
      variacionBs: parseFloat(row[2]) || 0,
      variacionPct: row[3] || "0.00%",
    }))

    let totalDiffBs = 0
    let totalDiffPct = 0
    let daysCount = finalHistory.length - 1

    for (let i = 1; i < finalHistory.length; i++) {
      const diff = finalHistory[i].tasa - finalHistory[i - 1].tasa
      totalDiffBs += diff
      totalDiffPct += (diff / finalHistory[i - 1].tasa) * 100
    }

    const avgDailyIncreaseBs = daysCount > 0 ? totalDiffBs / daysCount : 0
    const avgDailyIncreasePct = daysCount > 0 ? totalDiffPct / daysCount : 0

    // Proyecciones
    const lastRate = finalHistory[finalHistory.length - 1]?.tasa || currentRate
    const projected15Days = lastRate + avgDailyIncreaseBs * 15
    const projectedChangePct15Days = (avgDailyIncreaseBs * 15 / lastRate) * 100

    return NextResponse.json({
      success: true,
      history: finalHistory.reverse(), // Orden inverso para mostrar lo más reciente arriba
      analysis: {
        currentRate: lastRate,
        avgDailyIncreaseBs,
        avgDailyIncreasePct,
        projectedRate15Days: projected15Days,
        projectedChangePct15Days,
      },
    })
  } catch (error: any) {
    console.error("Error en historial del dólar:", error)
    return NextResponse.json(
      { message: error.message || "Error al procesar el historial del dólar." },
      { status: 500 }
    )
  }
}
