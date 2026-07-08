import { NextRequest, NextResponse } from "next/server"
import { verifyToken, normalizePhoneNumber } from "@/lib/auth"

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

    const { base64Image } = await req.json()
    if (!base64Image) {
      return NextResponse.json({ message: "La imagen del comprobante en formato base64 es requerida." }, { status: 400 })
    }

    // 2. Enviar a la API de OCR.space
    const ocrSpaceApiKey = process.env.OCR_SPACE_API_KEY || "helloworld"
    
    const formData = new FormData()
    formData.append("apikey", ocrSpaceApiKey)
    formData.append("base64Image", base64Image)
    formData.append("language", "spa")
    formData.append("isOverlayRequired", "false")
    formData.append("scale", "true")
    formData.append("detectOrientation", "true")
    formData.append("OCREngine", "2") // Motor 2 para mayor precisión en dígitos de comprobantes

    const ocrResponse = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      body: formData,
    })

    if (!ocrResponse.ok) {
      throw new Error(`OCR.space respondió con estatus ${ocrResponse.status}`)
    }

    const ocrData = await ocrResponse.json()
    if (ocrData.IsErroredOnProcessing) {
      throw new Error(ocrData.ErrorMessage?.[0] || "Error al procesar la imagen en OCR.")
    }

    const parsedText = ocrData.ParsedResults?.[0]?.ParsedText || ""
    console.log("OCR parsed text:", parsedText)

    // 3. Extraer número de referencia usando expresiones regulares
    // Normalizamos el texto (remover acentos, colapsar espacios, etc.)
    const cleanText = parsedText
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[:.\-_]/g, " ")
      .replace(/\s+/g, " ")

    let detectedReference = ""

    // Patrón 1: Palabras clave bancarias (ref, referencia, operacion, nro, transaccion, etc.) seguidas de un número
    const keywordRegex = /(?:referencia|ref|operacion|nro|numero|transaccion|confirmacion|aprobacion)\s*(\d{6,14})\b/i
    const match = cleanText.match(keywordRegex)
    
    if (match && match[1]) {
      detectedReference = match[1]
    } else {
      // Patrón 2: Cualquier número suelto de 7 a 12 dígitos como fallback
      // Omitiendo posibles números de teléfono (que en Venezuela empiezan con 0412, 0414, 0424, 0416, 0426, 58412, etc.)
      const numberRegex = /\b(\d{7,12})\b/g
      let m
      const fallbacks: string[] = []
      
      while ((m = numberRegex.exec(cleanText)) !== null) {
        const num = m[1]
        // Filtrar números telefónicos típicos venezolanos de 10 u 11 dígitos
        const isPhone = /^(0412|0414|0424|0416|0426|0212|412|414|424|416|426)\d+/.test(num)
        if (!isPhone) {
          fallbacks.push(num)
        }
      }

      if (fallbacks.length > 0) {
        // Seleccionamos la secuencia de dígitos más larga o la primera detectada
        detectedReference = fallbacks[0]
      }
    }

    return NextResponse.json({
      success: true,
      reference: detectedReference || null,
      rawText: parsedText,
    })
  } catch (error: any) {
    console.error("Error en OCR de comprobante:", error)
    return NextResponse.json(
      { message: error.message || "Error al procesar el comprobante mediante OCR." },
      { status: 500 }
    )
  }
}
