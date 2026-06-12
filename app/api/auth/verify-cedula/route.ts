import { google } from "googleapis"
import { NextRequest, NextResponse } from "next/server"
import path from "path"
import fs from "fs"
import { verifyToken, createToken, normalizePhoneNumber } from "@/lib/auth"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    // 1. Validar sesión del usuario
    const token = req.cookies.get("auth_token")?.value
    if (!token) {
      return NextResponse.json(
        { message: "No autorizado. Inicie sesión para realizar la verificación." },
        { status: 401 }
      )
    }

    const decodedUser = await verifyToken(token)
    if (!decodedUser) {
      return NextResponse.json(
        { message: "Sesión inválida o expirada." },
        { status: 401 }
      )
    }

    // 2. Extraer cuerpo
    const { cedulaPhoto } = await req.json()
    if (!cedulaPhoto) {
      return NextResponse.json(
        { message: "La foto de la cédula es requerida." },
        { status: 400 }
      )
    }

    const sheetId = process.env.GOOGLE_SHEET_ID
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
    const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN
    const ocrSpaceApiKey = process.env.OCR_SPACE_API_KEY || "helloworld"

    if (!sheetId) {
      return NextResponse.json(
        { message: "Falta configurar la variable GOOGLE_SHEET_ID." },
        { status: 500 }
      )
    }

    if (!clientId || !clientSecret || !refreshToken) {
      return NextResponse.json(
        { message: "Faltan las credenciales de OAuth2 para Google Drive." },
        { status: 500 }
      )
    }

    // 3. Subir la foto de la cédula a Google Drive (OAuth2)
    let driveLink = ""
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
    const normalizedPhone = normalizePhoneNumber(decodedUser.telefono)

    const matches = cedulaPhoto.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
    if (!matches || matches.length !== 3) {
      return NextResponse.json(
        { message: "El formato de la foto de la cédula es inválido." },
        { status: 400 }
      )
    }

    const mimeType = matches[1]
    const base64Data = matches[2]
    const buffer = Buffer.from(base64Data, "base64")

    // Crear stream para la API de Google
    const { Readable } = require("stream")
    const bufferStream = new Readable()
    bufferStream.push(buffer)
    bufferStream.push(null)

    // Inicializar Google Auth para Drive (OAuth2)
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
    oauth2Client.setCredentials({ refresh_token: refreshToken })

    const drive = google.drive({ version: "v3", auth: oauth2Client })
    const fileResponse = await drive.files.create({
      requestBody: {
        name: `cedula_${normalizedPhone}_${Date.now()}.${mimeType.split("/")[1] || "png"}`,
        parents: folderId ? [folderId] : undefined,
      },
      media: {
        mimeType: mimeType,
        body: bufferStream,
      },
      supportsAllDrives: true,
    })

    const fileId = fileResponse.data.id
    if (fileId) {
      driveLink = `https://drive.google.com/open?id=${fileId}`
    } else {
      throw new Error("No se pudo obtener el ID del archivo subido a Google Drive.")
    }

    // 4. Verificación de la cédula con la API de OCR.space (AI OCR)
    let verificado = "NO_VERIFICADA"
    let verificacionMotivo = "No se pudo procesar la verificación con OCR."

    try {
      let ocrResponse = null
      let attempts = 0
      const maxAttempts = 3

      while (attempts < maxAttempts) {
        try {
          const formData = new FormData()
          formData.append("apikey", ocrSpaceApiKey)
          formData.append("base64Image", cedulaPhoto)
          formData.append("language", "spa")
          formData.append("isOverlayRequired", "false")
          formData.append("scale", "true") // Mejorar resolución de la imagen
          formData.append("detectOrientation", "true") // Detectar rotación automática
          formData.append("OCREngine", "2") // Usar Motor 2 (mucho más preciso para números y letras en IDs)

          ocrResponse = await fetch("https://api.ocr.space/parse/image", {
            method: "POST",
            body: formData,
          })

          if (ocrResponse.ok) {
            break // Exitoso, salimos del bucle
          }
        } catch (fetchErr) {
          console.error(`Intento ${attempts + 1} de OCR fallido por error de red:`, fetchErr)
        }
        attempts++
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1500)) // Esperar 1.5s antes de reintentar
        }
      }

      if (!ocrResponse || !ocrResponse.ok) {
        verificado = "NO_VERIFICADA"
        const statusText = ocrResponse ? `Estado HTTP ${ocrResponse.status}` : "Sin respuesta del servidor"
        verificacionMotivo = `Error de conexión con el servicio de validación (${statusText}).`
      } else {
        const ocrData = await ocrResponse.json()
        if (ocrData.IsErroredOnProcessing) {
          verificado = "NO_VERIFICADA"
          verificacionMotivo = ocrData.ErrorMessage?.[0] || "Error al procesar la imagen con OCR."
        } else {
          const parsedText = ocrData.ParsedResults?.[0]?.ParsedText || ""
          if (!parsedText.trim()) {
            verificado = "NO_VERIFICADA"
            verificacionMotivo = "No se pudo leer ningún texto de la foto de la cédula."
          } else {
            // Función para extraer fechas en varios formatos (DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY, DD-MM-YY, MM-YYYY, etc.)
            const extractDates = (text: string): Date[] => {
              const datesList: Date[] = []
              // Normalizar separadores removiendo espacios
              const normalizedText = text.replace(/\s*([-/.,])\s*/g, "$1")
              
              // 1. Patrón DD-MM-YYYY o DD/MM/YYYY o DD.MM.YYYY
              const p1 = /\b(\d{1,2})[-/.,](\d{1,2})[-/.,](\d{4})\b/g
              let m
              while ((m = p1.exec(normalizedText)) !== null) {
                const day = parseInt(m[1], 10)
                const month = parseInt(m[2], 10)
                const year = parseInt(m[3], 10)
                if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                  datesList.push(new Date(year, month - 1, day))
                }
              }

              // 2. Patrón DD-MM-YY o DD/MM/YY (2 dígitos para el año)
              const p2 = /\b(\d{1,2})[-/.,](\d{1,2})[-/.,](\d{2})\b/g
              while ((m = p2.exec(normalizedText)) !== null) {
                const day = parseInt(m[1], 10)
                const month = parseInt(m[2], 10)
                const yy = parseInt(m[3], 10)
                const year = yy < 50 ? 2000 + yy : 1900 + yy
                if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                  datesList.push(new Date(year, month - 1, day))
                }
              }

              // 3. Patrón MM-YYYY o MM/YYYY (común para vencimiento)
              const p3 = /\b(\d{1,2})[-/.,](\d{4})\b/g
              while ((m = p3.exec(normalizedText)) !== null) {
                const month = parseInt(m[1], 10)
                const year = parseInt(m[2], 10)
                if (month >= 1 && month <= 12) {
                  // Se asume el último día del mes respectivo
                  datesList.push(new Date(year, month, 0))
                }
              }

              return datesList
            }

            const cleanString = (str: string): string => {
              if (!str) return ""
              return str
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "") // Remover acentos
                .replace(/[^a-z0-9]/g, " ")       // Reemplazar no-alfanumérico por espacios
                .replace(/\s+/g, " ")            // Colapsar espacios
                .trim()
            }

            const cleanedText = cleanString(parsedText)
            const cedulaDigits = decodedUser.cedula.replace(/\D/g, "")
            const textDigits = parsedText.replace(/\D/g, "")

            const nameWords = cleanString(decodedUser.nombres).split(" ").filter(w => w.length > 2)
            const apellidoWords = cleanString(decodedUser.apellidos).split(" ").filter(w => w.length > 2)

            // Validaciones específicas
            const hasRepublica = cleanedText.includes("republica") || cleanedText.includes("bolivariana") || cleanedText.includes("venezuela")
            const hasCedulaIdentidad = cleanedText.includes("cedula") || cleanedText.includes("identidad")
            const hasCedulaMatch = textDigits.includes(cedulaDigits)
            const hasNameMatch = nameWords.length === 0 || nameWords.some(w => cleanedText.includes(w))
            const hasApellidoMatch = apellidoWords.length === 0 || apellidoWords.some(w => cleanedText.includes(w))
            const hasFNacimiento = cleanedText.includes("nacimiento") || cleanedText.includes("nacim") || cleanedText.includes("nacto")
            const hasEdoCivil = cleanedText.includes("civil") || cleanedText.includes("edo") || cleanedText.includes("soltero") || cleanedText.includes("casado") || cleanedText.includes("divorciado") || cleanedText.includes("viudo")
            const hasFExpedicion = cleanedText.includes("expedicion") || cleanedText.includes("exped")
            const hasFVencimiento = cleanedText.includes("vencimiento") || cleanedText.includes("venc")
            const hasVenezolano = cleanedText.includes("venezolano") || cleanedText.includes("venezolana") || cleanedText.includes("venezolan")

            // Extraer y validar fecha de vencimiento
            const datesExtracted = extractDates(parsedText)
            let expirationDateStr = "No detectada"
            let hasValidExpiration = false

            if (datesExtracted.length > 0) {
              const maxDate = new Date(Math.max(...datesExtracted.map(d => d.getTime())))
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              maxDate.setHours(0, 0, 0, 0)

              hasValidExpiration = maxDate >= today
              
              const day = String(maxDate.getDate()).padStart(2, '0')
              const month = String(maxDate.getMonth() + 1).padStart(2, '0')
              const year = maxDate.getFullYear()
              expirationDateStr = `${day}-${month}-${year}`
            }

            const checks = [
              { name: "REPUBLICA BOLIVARIANA DE VENEZUELA", passed: hasRepublica },
              { name: "CEDULA DE IDENTIDAD", passed: hasCedulaIdentidad },
              { name: `V- ${cedulaDigits} (Cédula coincidente)`, passed: hasCedulaMatch },
              { name: `NOMBRES coincidentes (${decodedUser.nombres})`, passed: hasNameMatch },
              { name: `APELLIDOS coincidentes (${decodedUser.apellidos})`, passed: hasApellidoMatch },
              { name: "F. NACIMIENTO", passed: hasFNacimiento },
              { name: "EDO CIVIL", passed: hasEdoCivil },
              { name: "F. EXPEDICION", passed: hasFExpedicion },
              { name: "F. VENCIMIENTO", passed: hasFVencimiento },
              { name: "VENEZOLANO/A", passed: hasVenezolano },
              { name: `Fecha de vencimiento vigente (${expirationDateStr})`, passed: datesExtracted.length > 0 && hasValidExpiration }
            ]

            const allPassed = checks.every(c => c.passed)

            if (allPassed) {
              verificado = "VERIFICADA"
              verificacionMotivo = "La cédula coincide y cumple con todos los requisitos de autenticidad."
            } else {
              verificado = "NO_VERIFICADA"
              const checklist = checks.map(c => `${c.passed ? "✓" : "✗"} ${c.name}`).join("\n")
              verificacionMotivo = `Requisitos de la cédula:\n${checklist}`
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Error al llamar a la API de OCR.space:", error)
      verificacionMotivo = "Error interno durante la verificación de la cédula."
    }

    if (verificado === "NO_VERIFICADA") {
      verificacionMotivo = `${verificacionMotivo}\n\nEs importante que tomes la foto en un lugar bien iluminado, donde se vea claramente e intentes nuevamente.`
    }

    // 5. Inicializar Cuenta de Servicio para Sheets
    let sheetsAuth
    const localCredsFilename = process.env.GOOGLE_SERVICE_ACCOUNT_FILE || "mapsproject-478319-25d1d60bf518.json"
    const credentialsPath = path.join(/*turbopackIgnore: true*/ process.cwd(), localCredsFilename)

    if (fs.existsSync(credentialsPath)) {
      sheetsAuth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      })
    } else {
      const clientEmail = process.env.GOOGLE_CLIENT_EMAIL
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n")
      if (!clientEmail || !privateKey) {
        return NextResponse.json(
          { message: "Credenciales de Google Sheets no encontradas en el servidor." },
          { status: 500 }
        )
      }
      sheetsAuth = new google.auth.GoogleAuth({
        credentials: { client_email: clientEmail, private_key: privateKey },
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      })
    }

    const sheets = google.sheets({ version: "v4", auth: sheetsAuth })

    // 6. Buscar el usuario en la hoja de cálculo
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "A:P",
    })

    const rows = getResponse.data.values || []
    const userIndex = rows.findIndex((row) => {
      if (!row[3]) return false
      return normalizePhoneNumber(row[3].toString()) === normalizedPhone
    })

    if (userIndex === -1) {
      return NextResponse.json(
        { message: "Usuario no encontrado en la base de datos." },
        { status: 404 }
      )
    }

    const rowNumber = userIndex + 1 // 1-indexed para Google Sheets

    // 7. Actualizar las columnas de verificación (N: Foto Cédula, O: Verificado, P: Motivo)
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `N${rowNumber}:P${rowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            driveLink,
            verificado,
            verificacionMotivo,
          ],
        ],
      },
    })

    // 8. Regenerar sesión JWT con datos actualizados
    const updatedPayload = {
      ...decodedUser,
      driveLink,
      verificado,
      verificacionMotivo,
    }

    const newToken = await createToken(updatedPayload)

    const response = NextResponse.json({
      success: true,
      user: updatedPayload,
    })

    response.cookies.set({
      name: "auth_token",
      value: newToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 30, // 30 días
      path: "/",
    })

    return response
  } catch (error: any) {
    console.error("Error en verify-cedula route:", error)
    return NextResponse.json(
      { message: error.message || "Error interno al procesar la verificación de la cédula." },
      { status: 500 }
    )
  }
}
