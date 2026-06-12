import { SignJWT, jwtVerify } from "jose"

export function normalizePhoneNumber(phone: string): string {
  // Eliminar todos los caracteres no numéricos excepto el '+' al principio
  let cleaned = phone.replace(/[^\d+]/g, "")
  
  if (cleaned.startsWith("+58")) {
    cleaned = "0" + cleaned.slice(3)
  } else if (cleaned.startsWith("58")) {
    cleaned = "0" + cleaned.slice(2)
  } else if (!cleaned.startsWith("0") && (cleaned.length === 10 || cleaned.length === 11)) {
    // Si no empieza con 0 y tiene longitud de celular estándar, agregamos el 0
    if (cleaned.length === 10) {
      cleaned = "0" + cleaned
    }
  }
  return cleaned
}


const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-value-for-dev-only-change-in-prod-478319"
)

export async function createToken(payload: {
  telefono: string
  nombres: string
  apellidos: string
  cedula: string
  profesion: string
  diasCobro: string
}) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d") // Validez de 30 días
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as {
      telefono: string
      nombres: string
      apellidos: string
      cedula: string
      profesion: string
      diasCobro: string
    }
  } catch (error) {
    return null
  }
}
