import { NextRequest, NextResponse } from "next/server"
import { verifyToken, normalizePhoneNumber } from "@/lib/auth"
import { getSheetsClient } from "@/lib/google-sheets"

export const runtime = "nodejs"

// GET: Retorna la configuración de intereses actual (público)
export async function GET() {
  try {
    const { sheets, sheetId } = getSheetsClient()

    // Verificar si la hoja "Configuracion" existe, si no, crearla e inicializarla
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    })
    const sheetsList = spreadsheet.data.sheets || []
    const hasConfigSheet = sheetsList.some((s) => s.properties?.title === "Configuracion")

    if (!hasConfigSheet) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: "Configuracion",
                },
              },
            },
          ],
        },
      })

      const defaultConfigs = [
        ["Parametro", "Valor"],
        ["Tasa_Interes_Base", "54"],
        ["Interes_Nivel_1", "54"],
        ["Interes_Nivel_2", "52"],
        ["Interes_Nivel_3", "50"],
        ["Interes_Nivel_4", "48"],
        ["Interes_Nivel_5", "46"],
        ["Interes_Nivel_6", "44"],
        ["Interes_Nivel_7", "42"],
        ["Interes_Nivel_8", "40"],
        ["Interes_Nivel_9", "38"],
      ]

      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: "'Configuracion'!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: defaultConfigs,
        },
      })
    }

    // Leer valores
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "'Configuracion'!A:B",
    })

    const rows = getResponse.data.values || []
    const config: { [key: string]: number } = {}

    rows.slice(1).forEach((row) => {
      if (row[0]) {
        config[row[0].toString().trim()] = parseFloat(row[1]) || 0
      }
    })

    return NextResponse.json({
      success: true,
      config,
    })
  } catch (error: any) {
    console.error("Error al obtener la configuración:", error)
    return NextResponse.json(
      { message: error.message || "Error al procesar la configuración." },
      { status: 500 }
    )
  }
}

// POST: Actualiza los valores de configuración (Solo Admin)
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

    const { config } = await req.json()
    if (!config || typeof config !== "object") {
      return NextResponse.json({ message: "Configuración inválida." }, { status: 400 })
    }

    const { sheets, sheetId } = getSheetsClient()

    // Convertir objeto config a filas de Sheets
    const rows = [["Parametro", "Valor"]]
    Object.keys(config).forEach((key) => {
      rows.push([key, config[key].toString()])
    })

    // Actualizar en Sheets
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: "'Configuracion'!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: rows,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Configuración de intereses actualizada correctamente.",
    })
  } catch (error: any) {
    console.error("Error al actualizar la configuración:", error)
    return NextResponse.json(
      { message: error.message || "Error al actualizar la configuración." },
      { status: 500 }
    )
  }
}
