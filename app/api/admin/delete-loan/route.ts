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
      isManual,
      rowIndex,
      timestamp,
      cedula
    } = await req.json()

    if (!rowIndex) {
      return NextResponse.json({ message: "Falta el campo rowIndex." }, { status: 400 })
    }

    const { sheets, sheetId } = getSheetsClient()

    // Validar el préstamo antes de eliminar
    const tabName = isManual ? "Carga manual" : "Solicitudes"

    // Obtener información de la hoja para validar y para obtener el GID de la pestaña
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    })

    const sheet = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title === tabName
    )

    if (!sheet) {
      return NextResponse.json({ message: `No se encontró la pestaña '${tabName}' en la hoja de cálculo.` }, { status: 404 })
    }

    const sheetGID = sheet.properties?.sheetId
    if (sheetGID === undefined || sheetGID === null) {
      return NextResponse.json({ message: "No se pudo obtener el ID de la pestaña." }, { status: 500 })
    }

    // Validación de seguridad para evitar borrar la fila equivocada
    if (isManual) {
      const checkRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `'Carga manual'!A${rowIndex}:D${rowIndex}`,
      })
      const checkRow = checkRes.data.values?.[0] || []
      if (!checkRow || checkRow.length === 0) {
        return NextResponse.json({ message: "La fila especificada está vacía o no existe." }, { status: 404 })
      }
    } else {
      if (!timestamp || !cedula) {
        return NextResponse.json({ message: "Faltan campos obligatorios para préstamo web (timestamp, cedula)." }, { status: 400 })
      }
      const checkRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `'Solicitudes'!A${rowIndex}:B${rowIndex}`,
      })
      const checkRow = checkRes.data.values?.[0] || []
      const rowTimestamp = checkRow[0] ? checkRow[0].toString().trim() : ""
      const rowCedula = checkRow[1] ? checkRow[1].toString().trim().replace(/\D/g, "") : ""
      const cleanTargetCedula = cedula.toString().trim().replace(/\D/g, "")

      if (rowTimestamp !== timestamp.toString().trim() || rowCedula !== cleanTargetCedula) {
        return NextResponse.json({ message: "La fila no coincide con el préstamo especificado." }, { status: 400 })
      }
    }

    // 2. Eliminar la fila
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetGID,
                dimension: "ROWS",
                startIndex: rowIndex - 1, // 0-based
                endIndex: rowIndex,
              },
            },
          },
        ],
      },
    })

    return NextResponse.json({ success: true, message: "Préstamo eliminado exitosamente." })

  } catch (error: any) {
    console.error("Error al eliminar el préstamo:", error)
    return NextResponse.json(
      { message: `Error interno del servidor: ${error.message}` },
      { status: 500 }
    )
  }
}
