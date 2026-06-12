import { google } from "googleapis"
import { NextResponse } from "next/server"
import path from "path"
import fs from "fs"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const { nombres, apellidos, cedula, telefono, profesion, diasCobro } = await req.json()

    // Validación básica de campos
    if (!nombres || !apellidos || !cedula || !telefono || !profesion || !diasCobro) {
      return NextResponse.json(
        { message: "Todos los campos son requeridos." },
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

    // Agrega la fila a la hoja de cálculo.
    // Usamos el rango 'A:F' para asegurar la inserción en las primeras 6 columnas
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "A:F",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[nombres, apellidos, cedula, telefono, profesion, diasCobro]],
      },
    })

    return NextResponse.json({ success: true, data: response.data })
  } catch (error: any) {
    console.error("Error al escribir en Google Sheets:", error)
    return NextResponse.json(
      { message: error.message || "Error al procesar y guardar la solicitud." },
      { status: 500 }
    )
  }
}
