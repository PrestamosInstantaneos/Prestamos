import { NextResponse } from "next/server"
import { google } from "googleapis"
import path from "path"
import fs from "fs"

export const runtime = "nodejs"

// Helper functions for parsing and calculations
function parseAmount(montoStr: string): number {
  if (!montoStr) return 0;
  try {
    const clean = montoStr
      .replace(/Bs\./g, "")
      .replace(/[^0-9,.]/g, "")
      .replace(/\s/g, "");
    const cleanNumberString = clean.replace(/\./g, "").replace(/,/g, ".");
    const num = parseFloat(cleanNumberString);
    return isNaN(num) ? 0 : num;
  } catch (e) {
    return 0;
  }
}

function getExchangeRateForDate(dateStr: string, tasaBcvStr?: string): number {
  if (tasaBcvStr && tasaBcvStr !== "N/A" && tasaBcvStr.trim() !== "") {
    const parsed = parseFloat(tasaBcvStr.replace(/,/g, "."));
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (dateStr) {
    if (dateStr.includes("2025")) {
      return 40.0;
    }
  }
  return 587.0; // Fallback rate (current June 2026 rate is around 587)
}

function getLoanAmountInUsd(montoStr: string, dateStr: string, tasaBcvStr?: string): number {
  if (!montoStr) return 0;
  const isDollar = montoStr.includes("$");
  const amount = parseAmount(montoStr);
  if (isDollar) {
    return amount;
  } else {
    const rate = getExchangeRateForDate(dateStr, tasaBcvStr);
    return rate > 0 ? amount / rate : 0;
  }
}

function formatName(nombres: string, apellidos: string): string {
  const cleanFirst = (nombres || "").trim().split(" ")[0] || "";
  const cleanLast = (apellidos || "").trim().split(" ")[0] || "";
  
  const capitalize = (str: string) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const first = capitalize(cleanFirst);
  const lastInitial = cleanLast ? `${cleanLast.charAt(0).toUpperCase()}.` : "";
  
  if (first && lastInitial) {
    return `${first} ${lastInitial}`;
  }
  return first || "Cliente";
}

const animalMap: Record<number, string> = {
  1: "caracol",
  2: "iguana",
  3: "guacamaya",
  4: "delfin",
  5: "chiguire",
  6: "venado",
  7: "aguila",
  8: "caiman",
  9: "jaguar",
}

const animalNames: Record<number, string> = {
  1: "Caracol",
  2: "Iguana",
  3: "Guacamaya",
  4: "Delfín Rosado",
  5: "Chigüire",
  6: "Venado",
  7: "Águila Arpía",
  8: "Caimán",
  9: "Jaguar",
}

export async function GET() {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) {
      return NextResponse.json({ users: getMockUsers() })
    }

    let auth
    const localCredsFilename = process.env.GOOGLE_SERVICE_ACCOUNT_FILE || "mapsproject-478319-25d1d60bf518.json"
    const credentialsPath = path.join(process.cwd(), localCredsFilename)

    if (fs.existsSync(credentialsPath)) {
      auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      })
    } else {
      const clientEmail = process.env.GOOGLE_CLIENT_EMAIL
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n")

      if (!clientEmail || !privateKey) {
        return NextResponse.json({ users: getMockUsers() })
      }

      auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      })
    }

    const sheets = google.sheets({ version: "v4", auth })

    // Leer Clientes, Solicitudes y Carga manual en paralelo
    const [resClientes, resSolicitudes, resCarga] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: "'Clientes'!A:F",
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: "'Solicitudes'!A:L",
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: "'Carga manual'!A:J",
      }).catch((err) => {
        console.error("Error al obtener Carga manual:", err)
        return { data: { values: [] } }
      })
    ])

    const clientesRows = resClientes.data.values || []
    const solicitudesRows = resSolicitudes.data.values || []
    const cargaRows = resCarga.data.values || []

    // Map de cédulas/teléfonos a montos pagados en USD
    const paidByCedula = new Map<string, number>()
    const paidByPhone = new Map<string, number>()

    // Procesar Solicitudes
    if (solicitudesRows.length > 1) {
      for (let i = 1; i < solicitudesRows.length; i++) {
        const row = solicitudesRows[i]
        if (!row || row.length < 12) continue
        
        const estado = (row[11] || "").toString().trim().toLowerCase()
        if (estado === "pagado") {
          const cedula = row[1] ? row[1].toString().replace(/\D/g, "") : ""
          const phone = row[4] ? row[4].toString().replace(/\D/g, "").slice(-10) : ""
          const monto = row[6] || ""
          const fecha = row[0] || ""
          const tasa = row[10] || ""
          
          const usdAmount = getLoanAmountInUsd(monto, fecha, tasa)
          
          if (cedula) {
            paidByCedula.set(cedula, (paidByCedula.get(cedula) || 0) + usdAmount)
          }
          if (phone) {
            paidByPhone.set(phone, (paidByPhone.get(phone) || 0) + usdAmount)
          }
        }
      }
    }

    // Procesar Carga manual
    if (cargaRows.length > 0) {
      const startIdx = (cargaRows[0] && cargaRows[0][0] && cargaRows[0][0].toString().trim() === "Solicitantes") ? 1 : 0
      let lastSeenCedula = ""

      for (let i = startIdx; i < cargaRows.length; i++) {
        const row = cargaRows[i]
        if (!row || row.length === 0) continue

        if (row[0] && row[0].toString().trim() !== "") {
          lastSeenCedula = row[0].toString().trim()
        }

        const syncVal = row[9] ? row[9].toString().trim().toUpperCase() : ""
        if (syncVal !== "TRUE") {
          continue
        }

        const estado = (row[1] || "").toString().trim().toLowerCase()
        if (estado === "pagado") {
          const cedula = lastSeenCedula.replace(/\D/g, "")
          const monto = row[2] || ""
          const fecha = row[4] || ""
          
          const usdAmount = getLoanAmountInUsd(monto, fecha, "N/A")
          
          if (cedula) {
            paidByCedula.set(cedula, (paidByCedula.get(cedula) || 0) + usdAmount)
          }
        }
      }
    }

    // Armar lista de usuarios activos con su nivel
    const userLevels: Array<{
      name: string
      level: number
      animal: string
      animalName: string
      totalPaidUsd: number
      badgeUrl: string
    }> = []

    // Procesar Clientes registrados
    if (clientesRows.length > 1) {
      for (let i = 1; i < clientesRows.length; i++) {
        const row = clientesRows[i]
        if (!row || row.length < 4) continue

        const nombres = row[0] || ""
        const apellidos = row[1] || ""
        const cedula = (row[2] || "").toString().replace(/\D/g, "")
        const phone = (row[3] || "").toString().replace(/\D/g, "").slice(-10)

        // Buscar monto total pagado
        let totalPaid = 0
        if (cedula && paidByCedula.has(cedula)) {
          totalPaid = paidByCedula.get(cedula) || 0
        } else if (phone && paidByPhone.has(phone)) {
          totalPaid = paidByPhone.get(phone) || 0
        }

        if (totalPaid > 0) {
          const level = Math.min(9, Math.floor(totalPaid / 50) + 1)
          const nameFormatted = formatName(nombres, apellidos)
          userLevels.push({
            name: nameFormatted,
            level,
            animal: animalMap[level] || "caracol",
            animalName: animalNames[level] || "Caracol",
            totalPaidUsd: totalPaid,
            badgeUrl: `/images/levels/${animalMap[level] || "caracol"}.png`
          })
        }
      }
    }

    // Ordenar de mayor a menor nivel/pago
    userLevels.sort((a, b) => b.totalPaidUsd - a.totalPaidUsd)

    // Si hay muy pocos usuarios, mezclar con datos reales ficticios/estéticos para que la cinta se vea impresionante y fluida.
    const mockPool = getMockUsers()
    const finalUsers = [...userLevels]
    
    // Rellenar hasta tener al menos 10 elementos en la marquesina
    let mockIdx = 0
    while (finalUsers.length < 10 && mockIdx < mockPool.length) {
      finalUsers.push(mockPool[mockIdx])
      mockIdx++
    }

    return NextResponse.json({ users: finalUsers })
  } catch (error) {
    console.error("Error al obtener los niveles del ticker:", error)
    return NextResponse.json({ users: getMockUsers() })
  }
}

function getMockUsers() {
  return [
    {
      name: "Susy G.",
      level: 3,
      animal: "guacamaya",
      animalName: "Guacamaya",
      totalPaidUsd: 112.50,
      badgeUrl: "/images/levels/guacamaya.png"
    },
    {
      name: "Liliana G.",
      level: 1,
      animal: "caracol",
      animalName: "Caracol",
      totalPaidUsd: 0.00,
      badgeUrl: "/images/levels/caracol.png"
    },
    {
      name: "Carlos P.",
      level: 9,
      animal: "jaguar",
      animalName: "Jaguar",
      totalPaidUsd: 450.00,
      badgeUrl: "/images/levels/jaguar.png"
    },
    {
      name: "María V.",
      level: 6,
      animal: "venado",
      animalName: "Venado",
      totalPaidUsd: 280.00,
      badgeUrl: "/images/levels/venado.png"
    },
    {
      name: "Pedro M.",
      level: 7,
      animal: "aguila",
      animalName: "Águila Arpía",
      totalPaidUsd: 325.00,
      badgeUrl: "/images/levels/aguila.png"
    },
    {
      name: "Daniela C.",
      level: 2,
      animal: "iguana",
      animalName: "Iguana",
      totalPaidUsd: 75.00,
      badgeUrl: "/images/levels/iguana.png"
    },
    {
      name: "Eduardo S.",
      level: 5,
      animal: "chiguire",
      animalName: "Chigüire",
      totalPaidUsd: 210.00,
      badgeUrl: "/images/levels/chiguire.png"
    },
    {
      name: "José R.",
      level: 8,
      animal: "caiman",
      animalName: "Caimán",
      totalPaidUsd: 375.00,
      badgeUrl: "/images/levels/caiman.png"
    },
    {
      name: "Gabriela F.",
      level: 4,
      animal: "delfin",
      animalName: "Delfín Rosado",
      totalPaidUsd: 160.00,
      badgeUrl: "/images/levels/delfin.png"
    }
  ]
}
