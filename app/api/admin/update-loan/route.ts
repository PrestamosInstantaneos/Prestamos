import { NextRequest, NextResponse } from "next/server"
import { verifyToken, normalizePhoneNumber } from "@/lib/auth"
import { getSheetsClient } from "@/lib/google-sheets"
import { google } from "googleapis"
import { Readable } from "stream"

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

    const { timestamp, cedula, estado, referencia, comprobanteBase64, isManual, rowIndex, notaPago, monedaPago } = await req.json()
    if (!estado) {
      return NextResponse.json({ message: "Falta el campo obligatorio (estado)." }, { status: 400 })
    }

    const { sheets, sheetId } = getSheetsClient()

    let clientFolderName = ""
    let driveLink = ""
    let targetRef = referencia || ""
    let rowIndexToUpdate = -1
    let loanInfo: any = null

    if (isManual) {
      if (!rowIndex) {
        return NextResponse.json({ message: "Falta el campo rowIndex para actualizar el préstamo manual." }, { status: 400 })
      }
      
      const manualRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `'Carga manual'!A${rowIndex}:J${rowIndex}`,
      })
      const manualRow = manualRes.data.values?.[0] || []
      const solicitante = manualRow[0] || "Cliente WhatsApp"
      
      clientFolderName = solicitante.trim()
      targetRef = referencia || manualRow[8] || ""
      driveLink = manualRow[9] || ""
    } else {
      if (!timestamp || !cedula) {
        return NextResponse.json({ message: "Faltan campos obligatorios para préstamo web (timestamp, cedula)." }, { status: 400 })
      }

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: "'Solicitudes'!A:N",
      })

      const rows = response.data.values || []
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        if (!row || row.length < 2) continue

        const rowTimestamp = row[0] ? row[0].toString().trim() : ""
        const rowCedula = row[1] ? row[1].toString().trim().replace(/\D/g, "") : ""
        const cleanTargetCedula = cedula.toString().trim().replace(/\D/g, "")

        if (rowTimestamp === timestamp.toString().trim() && rowCedula === cleanTargetCedula) {
          rowIndexToUpdate = i + 1
          loanInfo = {
            timestamp: row[0] || "",
            cedula: row[1] || "",
            nombres: row[2] || "",
            apellidos: row[3] || "",
            telefono: row[4] || "",
            modalidad: row[5] || "",
            monto: row[6] || "",
            fechas: row[8] || "",
            totalPagar: row[9] || "",
            referenciaExistente: row[12] || "",
            comprobanteExistente: row[13] || "",
          }
          break
        }
      }

      if (rowIndexToUpdate === -1 || !loanInfo) {
        return NextResponse.json({ message: "No se encontró ningún préstamo coincidente." }, { status: 404 })
      }

      clientFolderName = `${loanInfo.nombres} ${loanInfo.apellidos}`.trim()
      targetRef = referencia || loanInfo.referenciaExistente || ""
      driveLink = loanInfo.comprobanteExistente || ""
    }

    if (estado.toLowerCase() === "pagado" && comprobanteBase64 && targetRef) {
      try {
        const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
        const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
        const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN
        const parentFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID

        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
        oauth2Client.setCredentials({ refresh_token: refreshToken })
        const drive = google.drive({ version: "v3", auth: oauth2Client })

        const folderSearchName = clientFolderName || "Cliente WhatsApp"
        let clientFolderId = ""

        const searchClientFolder = await drive.files.list({
          q: `mimeType = 'application/vnd.google-apps.folder' and name = '${folderSearchName.replace(/'/g, "\\'")}' and '${parentFolderId}' in parents and trashed = false`,
          fields: "files(id)",
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        })

        const clientFolders = searchClientFolder.data.files || []
        if (clientFolders.length > 0 && clientFolders[0].id) {
          clientFolderId = clientFolders[0].id
        } else {
          const newFolder = await drive.files.create({
            requestBody: {
              name: folderSearchName,
              mimeType: "application/vnd.google-apps.folder",
              parents: parentFolderId ? [parentFolderId] : undefined,
            },
            supportsAllDrives: true,
          })
          clientFolderId = newFolder.data.id || ""
        }

        if (!clientFolderId) {
          throw new Error("No se pudo resolver la carpeta del cliente en Google Drive.")
        }

        const now = new Date()
        const venTime = new Date(now.getTime() + (now.getTimezoneOffset() - 240) * 60000)
        const day = String(venTime.getDate()).padStart(2, "0")
        const month = String(venTime.getMonth() + 1).padStart(2, "0")
        const year = venTime.getFullYear()
        const dateFolderName = `${day}-${month}-${year}`

        let dateFolderId = ""
        const searchDateFolder = await drive.files.list({
          q: `mimeType = 'application/vnd.google-apps.folder' and name = '${dateFolderName}' and '${clientFolderId}' in parents and trashed = false`,
          fields: "files(id)",
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        })

        const dateFolders = searchDateFolder.data.files || []
        if (dateFolders.length > 0 && dateFolders[0].id) {
          dateFolderId = dateFolders[0].id
        } else {
          const newDateFolder = await drive.files.create({
            requestBody: {
              name: dateFolderName,
              mimeType: "application/vnd.google-apps.folder",
              parents: [clientFolderId],
            },
            supportsAllDrives: true,
          })
          dateFolderId = newDateFolder.data.id || ""
        }

        if (!dateFolderId) {
          throw new Error("No se pudo resolver la carpeta de la fecha en Google Drive.")
        }

        const matches = comprobanteBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
        const mimeType = matches ? matches[1] : "image/png"
        const base64Data = matches ? matches[2] : comprobanteBase64
        const buffer = Buffer.from(base64Data, "base64")

        const bufferStream = new Readable()
        bufferStream.push(buffer)
        bufferStream.push(null)

        const extension = mimeType.split("/")[1] || "png"
        const fileName = `${targetRef.toString().trim()}.${extension}`

        const fileResponse = await drive.files.create({
          requestBody: {
            name: fileName,
            parents: [dateFolderId],
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
          throw new Error("No se pudo obtener el ID del comprobante subido a Google Drive.")
        }
      } catch (driveError: any) {
        console.error("Error al subir comprobante a Google Drive:", driveError)
        return NextResponse.json(
          { message: `Error al subir el comprobante a Google Drive: ${driveError.message}` },
          { status: 500 }
        )
      }
    }

    if (isManual) {
      const capitalizedEstado = estado.charAt(0).toUpperCase() + estado.slice(1).toLowerCase()

      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `'Carga manual'!B${rowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[capitalizedEstado]],
        },
      })

      if (capitalizedEstado.toLowerCase() === "pagado") {
        const todayParts = new Date().toLocaleDateString("es-VE").split("/")
        const todayStr = `${todayParts[0]}/${todayParts[1]}/${todayParts[2]}`
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `'Carga manual'!G${rowIndex}`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [[todayStr]],
          },
        })
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `'Carga manual'!I${rowIndex}:L${rowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[targetRef || "", driveLink || "", notaPago || "", monedaPago || "Bs."]],
        },
      })
    } else {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `'Solicitudes'!L${rowIndexToUpdate}:P${rowIndexToUpdate}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[estado, targetRef || "", driveLink || "", notaPago || "", monedaPago || "Bs."]],
        },
      })
    }

    // 6. Enviar notificación por Telegram si está configurado
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
    const telegramChatId = process.env.TELEGRAM_CHAT_ID

    if (telegramBotToken && telegramChatId) {
      try {
        let statusIcon = "ℹ️"
        if (estado === "Aprobado") statusIcon = "✅"
        else if (estado === "Rechazado") statusIcon = "❌"
        else if (estado === "Pagado") statusIcon = "💰"

        let receiptText = ""
        if (estado === "Pagado") {
          receiptText = `🔢 *Referencia:* ${targetRef || "N/A"}\n` +
            `📂 *Comprobante:* ${driveLink ? `[Ver en Drive](${driveLink})` : "No adjuntado"}\n`
        }

        const messageText = `📢 *Actualización de Préstamo* 📢\n\n` +
          `👤 *Cliente:* ${loanInfo.nombres} ${loanInfo.apellidos}\n` +
          `🪪 *Cédula:* ${loanInfo.cedula}\n` +
          `📞 *Teléfono:* ${loanInfo.telefono}\n` +
          `💰 *Monto:* ${loanInfo.monto}\n` +
          `📋 *Modalidad:* ${loanInfo.modalidad}\n` +
          `🗓️ *Fechas:* ${loanInfo.fechas}\n` +
          `💵 *Total a pagar:* ${loanInfo.totalPagar}\n` +
          receiptText + `\n` +
          `${statusIcon} *Nuevo Estatus:* \`${estado.toUpperCase()}\`\n` +
          `⚙️ _Actualizado de forma manual por el Administrador._`

        await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text: messageText,
            parse_mode: "Markdown",
          }),
        })
      } catch (tgError) {
        console.error("Error al enviar notificación de Telegram en update-loan:", tgError)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Estatus del préstamo actualizado a ${estado} correctamente.`,
      referencia: targetRef || null,
      comprobanteLink: driveLink || null,
    })
  } catch (error: any) {
    console.error("Error al actualizar estatus de préstamo:", error)
    return NextResponse.json(
      { message: error.message || "Error al actualizar la solicitud." },
      { status: 500 }
    )
  }
}
