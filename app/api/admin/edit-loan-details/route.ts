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
      cedula,
      monto,
      totalPagar,
      modalidad,
      fechas,
      referencia,
      estado,
      monedaMonto,
      monedaDeuda
    } = await req.json()

    const { sheets, sheetId } = getSheetsClient()

    const curMonto = monedaMonto || "Bs."
    const curDeuda = monedaDeuda || "Bs."
    const formattedMonto = typeof monto === "number" ? `${curMonto} ${monto.toLocaleString("es-VE")}` : monto
    const formattedTotalPagar = typeof totalPagar === "number" ? `${curDeuda} ${totalPagar.toLocaleString("es-VE")}` : totalPagar

    if (isManual) {
      if (!rowIndex) {
        return NextResponse.json({ message: "Falta el campo rowIndex para préstamo manual." }, { status: 400 })
      }

      // Update B:D (Estado, Monto Solicitado, Deuda)
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `'Carga manual'!B${rowIndex}:D${rowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[estado, formattedMonto, formattedTotalPagar]],
        },
      })

      // Update F (Modalidad)
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `'Carga manual'!F${rowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[modalidad]],
        },
      })

      // Update I (Referencia)
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `'Carga manual'!I${rowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[referencia]],
        },
      })

    } else {
      if (!timestamp || !cedula) {
        return NextResponse.json({ message: "Faltan campos obligatorios para préstamo web (timestamp, cedula)." }, { status: 400 })
      }

      // Buscar el préstamo por timestamp y cédula
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: "'Solicitudes'!A:N",
      })

      const rows = response.data.values || []
      let rowIndexToUpdate = -1

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        if (!row || row.length < 2) continue

        const rowTimestamp = row[0] ? row[0].toString().trim() : ""
        const rowCedula = row[1] ? row[1].toString().trim().replace(/\D/g, "") : ""
        const cleanTargetTarget = cedula.toString().trim().replace(/\D/g, "")

        if (rowTimestamp === timestamp.toString().trim() && rowCedula === cleanTargetTarget) {
          rowIndexToUpdate = i + 1
          break
        }
      }

      if (rowIndexToUpdate === -1) {
        return NextResponse.json({ message: "No se encontró ningún préstamo coincidente." }, { status: 404 })
      }

      // Update F:G (Modalidad, Monto Solicitado)
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `'Solicitudes'!F${rowIndexToUpdate}:G${rowIndexToUpdate}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[modalidad, formattedMonto]],
        },
      })

      // Update I:J (Fechas de Pago, Total a Pagar)
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `'Solicitudes'!I${rowIndexToUpdate}:J${rowIndexToUpdate}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[fechas, formattedTotalPagar]],
        },
      })

      // Update L:M (Estado, Referencia)
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `'Solicitudes'!L${rowIndexToUpdate}:M${rowIndexToUpdate}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[estado, referencia]],
        },
      })
    }

    return NextResponse.json({ success: true, message: "Préstamo editado exitosamente." })
  } catch (error: any) {
    console.error("Error al editar préstamo:", error)
    return NextResponse.json({ message: error.message || "Error interno del servidor." }, { status: 500 })
  }
}
