import { google } from "googleapis"
import path from "path"
import fs from "fs"

export function getSheetsClient() {
  const sheetId = process.env.GOOGLE_SHEET_ID
  if (!sheetId) {
    throw new Error("Falta la variable de entorno GOOGLE_SHEET_ID")
  }

  let auth
  const localCredsFilename = process.env.GOOGLE_SERVICE_ACCOUNT_FILE || "mapsproject-478319-25d1d60bf518.json"
  const credentialsPath = path.join(process.cwd(), localCredsFilename)

  const scopes = ["https://www.googleapis.com/auth/spreadsheets"]

  if (fs.existsSync(credentialsPath)) {
    auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes,
    })
  } else {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n")

    if (!clientEmail || !privateKey) {
      throw new Error("No se encontraron credenciales de cuenta de servicio (Google Client Email o Private Key)")
    }

    auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes,
    })
  }

  const sheets = google.sheets({ version: "v4", auth })

  return {
    sheets,
    sheetId,
  }
}
