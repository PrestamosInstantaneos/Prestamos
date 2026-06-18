import { NextRequest, NextResponse } from "next/server"
import { normalizePhoneNumber } from "@/lib/auth"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const { telefono } = await req.json()
    if (!telefono) {
      return NextResponse.json({ message: "El número de teléfono es requerido." }, { status: 400 })
    }

    const normalizedPhone = normalizePhoneNumber(telefono)

    // Validar formato básico de teléfono
    const cleanPhone = normalizedPhone.replace(/\D/g, "")
    if (cleanPhone.length < 10) {
      return NextResponse.json({ message: "El número de teléfono no es válido." }, { status: 400 })
    }

    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
    const telegramChatId = process.env.TELEGRAM_CHAT_ID

    if (telegramBotToken && telegramChatId) {
      const messageText = `🔑 *Solicitud de Recuperación de Clave* 🔑\n\n` +
        `📞 *Teléfono:* ${normalizedPhone}\n\n` +
        `El usuario ha solicitado restablecer su contraseña porque la ha olvidado. Por favor, ingresa al panel de administración en la web ("Ayuda al Cliente") para generar un enlace de restablecimiento de contraseña de un solo uso.`

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
    } else {
      console.warn("Telegram bot token or chat ID is missing in environment variables.")
    }

    return NextResponse.json({ success: true, message: "Ya nos estaremos comunicando con usted." })
  } catch (error: any) {
    console.error("Error en request-reset API:", error)
    return NextResponse.json({ message: error.message || "Error interno al enviar la solicitud." }, { status: 500 })
  }
}
