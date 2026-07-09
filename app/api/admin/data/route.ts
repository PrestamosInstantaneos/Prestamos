import { NextRequest, NextResponse } from "next/server"
import { verifyToken, normalizePhoneNumber } from "@/lib/auth"
import { getSheetsClient } from "@/lib/google-sheets"

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

    // 2. Obtener cliente de Sheets
    const { sheets, sheetId } = getSheetsClient()

    // 3. Obtener usuarios, solicitudes y registros manuales en paralelo
    const [usersResponse, loansResponse, manualResponse] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: "A:Q", // Registros de usuarios (primera hoja)
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: "'Solicitudes'!A:N", // Solicitudes de préstamos
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: "'Carga manual'!A:H", // Carga manual / WhatsApp
      })
    ])

    const userRows = usersResponse.data.values || []
    const loanRows = loansResponse.data.values || []
    const manualRows = manualResponse.data.values || []

    // 4. Procesar y filtrar filas
    // Omitir fila de cabecera si existe (ej. si la primera columna es "Nombres" o similar)
    const users = userRows
      .filter((row) => row && row[3] && row[3].toString().toLowerCase() !== "teléfono" && row[0].toString().toLowerCase() !== "nombres")
      .map((row, idx) => ({
        nombres: row[0] || "",
        apellidos: row[1] || "",
        cedula: row[2] || "",
        telefono: row[3] || "",
        profesion: row[4] || "",
        diasCobro: row[5] || "",
        fechaRegistro: row[7] || "",
        trabajando: row[8] || "",
        ciudad: row[9] || "",
        municipio: row[10] || "",
        calle: row[11] || "",
        referencias: row[12] || "",
        driveLink: row[13] || "", // Foto cédula
        verificado: row[14] || "NO_VERIFICADA",
        verificacionMotivo: row[15] || "",
        rostroDriveLink: row[16] || "", // Foto rostro
        rowIndex: idx + 2 // 1-based, skipping header row (assumes header is row 1)
      }))

    const loans = loanRows
      .filter((row) => row && row[1] && row[1].toString().toLowerCase() !== "cédula" && row[0].toString().toLowerCase() !== "timestamp")
      .map((row, idx) => ({
        timestamp: row[0] || "",
        cedula: row[1] || "",
        nombres: row[2] || "",
        apellidos: row[3] || "",
        telefono: row[4] || "",
        modalidad: row[5] || "",
        monto: row[6] || "",
        montoCuota: row[7] || "",
        fechas: row[8] || "",
        totalPagar: row[9] || "",
        bcvRate: row[10] || "",
        estado: row[11] || "Pendiente",
        referencia: row[12] || "",
        comprobanteLink: row[13] || "",
        rowIndex: idx + 2 // 1-based, skipping header row
      }))

    // Procesar registros manuales propagando el nombre del solicitante hacia abajo en filas vacías
    let lastSeenName = ""
    const manualLoans = manualRows
      .filter((row, idx) => idx > 0 && row && (row[0] || row[1] || row[2]))
      .map((row, idx) => {
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
          mora: row[7] || "N/A",
          rowIndex: idx + 2 // 1-based, skipping header row
        }
      })

    return NextResponse.json({
      success: true,
      users,
      loans,
      manualLoans,
    })
  } catch (error: any) {
    console.error("Error al obtener datos de administración:", error)
    return NextResponse.json(
      { message: error.message || "Error al procesar la solicitud." },
      { status: 500 }
    )
  }
}
