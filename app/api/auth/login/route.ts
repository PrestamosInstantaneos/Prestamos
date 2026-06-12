import { google } from "googleapis"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import path from "path"
import fs from "fs"
import { createToken, normalizePhoneNumber } from "@/lib/auth"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const { telefono, contraseña } = await req.json()

    if (!telefono || !contraseña) {
      return NextResponse.json(
        { message: "Número de teléfono y contraseña son requeridos." },
        { status: 400 }
      )
    }

    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) {
      return NextResponse.json(
        { message: "Falta la variable de entorno GOOGLE_SHEET_ID." },
        { status: 500 }
      )
    }

    // Inicializar Google Auth
    let auth
    const localCredsFilename = process.env.GOOGLE_SERVICE_ACCOUNT_FILE || "mapsproject-478319-25d1d60bf518.json"
    const credentialsPath = path.join(/*turbopackIgnore: true*/ process.cwd(), localCredsFilename)

    if (fs.existsSync(credentialsPath)) {
      auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      })
    } else {
      const clientEmail = process.env.GOOGLE_CLIENT_EMAIL
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n")

      if (!clientEmail || !privateKey) {
        return NextResponse.json(
          { message: "Credenciales de Google Sheets no encontradas." },
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

    // Leer los datos del Sheet
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "A:P",
    })

    const rows = getResponse.data.values || []
    const normalizedPhone = normalizePhoneNumber(telefono)

    // Buscar el usuario por teléfono (Columna 3 / D, 0-indexed)
    const userRow = rows.find((row) => {
      if (!row[3]) return false
      return normalizePhoneNumber(row[3].toString()) === normalizedPhone
    })

    if (!userRow) {
      return NextResponse.json(
        { message: "Número de teléfono o contraseña incorrectos." },
        { status: 401 }
      )
    }

    // Columna 6 (G) contiene el hash de la contraseña
    const storedHashedPassword = userRow[6]
    if (!storedHashedPassword) {
      return NextResponse.json(
        { message: "El usuario no cuenta con una contraseña configurada." },
        { status: 400 }
      )
    }

    // Comparar contraseñas
    const passwordMatch = await bcrypt.compare(contraseña, storedHashedPassword)

    if (!passwordMatch) {
      return NextResponse.json(
        { message: "Número de teléfono o contraseña incorrectos." },
        { status: 401 }
      )
    }

    // Obtener los datos del usuario de las columnas
    const userPayload = {
      nombres: userRow[0],
      apellidos: userRow[1],
      cedula: userRow[2],
      telefono: normalizedPhone,
      profesion: userRow[4],
      diasCobro: userRow[5],
      trabajando: userRow[8] || "",
      ciudad: userRow[9] || "",
      municipio: userRow[10] || "",
      calle: userRow[11] || "",
      referencias: userRow[12] || "",
      driveLink: userRow[13] || "",
      verificado: userRow[14] || "NO_VERIFICADA",
      verificacionMotivo: userRow[15] || "",
    }

    // Firmar sesión JWT
    const token = await createToken(userPayload)

    const response = NextResponse.json({
      success: true,
      user: userPayload,
    })

    // Establecer la cookie de sesión
    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 30, // 30 días
      path: "/",
    })

    return response
  } catch (error: any) {
    console.error("Error en el inicio de sesión:", error)
    return NextResponse.json(
      { message: error.message || "Error al procesar el inicio de sesión." },
      { status: 500 }
    )
  }
}
