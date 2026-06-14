import { NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { verifyToken } from "@/lib/auth"
import path from "path"
import fs from "fs"

export const runtime = "nodejs"

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

function formatMonto(val: string | number | undefined): string {
  if (val === undefined || val === null) return "";
  const str = val.toString().trim();
  if (str === "") return "";
  
  if (str.includes("Bs") || str.includes("$")) {
    return str;
  }
  
  const num = parseFloat(str.replace(/,/g, ""));
  if (!isNaN(num)) {
    return `Bs. ${num.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  return str;
}

function parseVenezuelaTimestamp(dateStr: string): number {
  if (!dateStr) return 0;
  try {
    const parts = dateStr.split(",");
    const datePart = parts[0].trim();
    const timePart = parts[1] ? parts[1].trim() : "";
    
    const normalizedDatePart = datePart.replace(/-/g, "/");
    const [day, month, year] = normalizedDatePart.split("/").map(Number);
    if (!day || !month || !year) return 0;

    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    if (timePart) {
      const cleanTime = timePart
        .toLowerCase()
        .replace(/a\.\s*m\./g, "am")
        .replace(/p\.\s*m\./g, "pm")
        .replace(/\s+/g, "");

      const isPM = cleanTime.includes("pm");
      const isAM = cleanTime.includes("am");
      const numericPart = cleanTime.replace("am", "").replace("pm", "");
      const [h, m, s] = numericPart.split(":").map(Number);
      
      hours = h || 0;
      minutes = m || 0;
      seconds = s || 0;

      if (isPM && hours < 12) hours += 12;
      if (isAM && hours === 12) hours = 0;
    }

    return new Date(year, month - 1, day, hours, minutes, seconds).getTime();
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

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value

    if (!token) {
      return NextResponse.json({ loans: [] }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded || !decoded.telefono) {
      return NextResponse.json({ loans: [] }, { status: 401 })
    }

    const userPhone = decoded.telefono
    const userCedula = decoded.cedula
    const userCedulaClean = userCedula ? userCedula.replace(/\D/g, "") : ""

    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) {
      return NextResponse.json({ loans: [] })
    }

    let auth
    const localCredsFilename = process.env.GOOGLE_SERVICE_ACCOUNT_FILE || "mapsproject-478319-25d1d60bf518.json"
    const credentialsPath = path.join(/*turbopackIgnore: true*/ process.cwd(), localCredsFilename)

    if (fs.existsSync(credentialsPath)) {
      auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      })
    } else {
      const clientEmail = process.env.GOOGLE_CLIENT_EMAIL
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n")

      if (!clientEmail || !privateKey) {
        return NextResponse.json({ loans: [] })
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

    // Leer Solicitudes y Carga manual en paralelo
    const [response, response3] = await Promise.all([
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

    const rows = response.data.values || []

    // Filtrar solicitudes de la pestaña Solicitudes correspondientes al teléfono del usuario o a su cédula
    const userLoans = rows
      .filter((row) => {
        // Coincidencia por teléfono (últimos 10 dígitos)
        const rowPhone = row[4] ? row[4].toString().replace(/\D/g, "").slice(-10) : ""
        const userPhoneNormalized = userPhone.replace(/\D/g, "").slice(-10)
        const phoneMatches = rowPhone && rowPhone === userPhoneNormalized

        // Coincidencia por cédula (solo dígitos numéricos)
        const rowCedula = row[1] ? row[1].toString().replace(/\D/g, "") : ""
        const userCedulaNormalized = userCedula ? userCedula.replace(/\D/g, "") : ""
        const cedulaMatches = rowCedula && rowCedula === userCedulaNormalized

        return phoneMatches || cedulaMatches
      })
      .map((row) => {
        return {
          fechaRegistro: row[0] || "",
          modalidad: row[5] || "",
          monto: row[6] || "",
          montoCuota: row[7] || "",
          fechasPago: row[8] || "",
          totalPagar: row[9] || "",
          tasaBCV: row[10] || "",
          estado: row[11] || "Pendiente",
          mora: "",
          observacion: "",
          source: "Solicitudes",
        }
      })

    // Procesar Carga manual (Migración de Excel)
    const rows3 = response3.data.values || []
    const hoja3Loans = []

    if (rows3.length > 0) {
      const startIdx = (rows3[0] && rows3[0][0] && rows3[0][0].toString().trim() === "Solicitantes") ? 1 : 0
      let lastSeenCedula = ""

      for (let i = startIdx; i < rows3.length; i++) {
        const row = rows3[i]
        if (!row || row.length === 0) continue

        if (row[0] && row[0].toString().trim() !== "") {
          lastSeenCedula = row[0].toString().trim()
        }

        // Validar si la fila se debe sincronizar (Columna J / índice 9)
        const syncVal = row[9] ? row[9].toString().trim().toUpperCase() : ""
        if (syncVal !== "TRUE") {
          continue
        }

        // Cruce por cédula (solo dígitos numéricos)
        const rowCedulaClean = lastSeenCedula.replace(/\D/g, "")
        if (!rowCedulaClean || !userCedulaClean || rowCedulaClean !== userCedulaClean) {
          continue
        }

        const estado = row[1] || "Pendiente"
        const monto = formatMonto(row[2])
        const totalPagar = formatMonto(row[3])
        const fechaRegistro = row[4] || ""
        const rawModalidad = row[5] || ""
        const fechasPago = row[6] || ""
        const mora = row[7] || ""
        const observacion = row[8] || ""

        // Normalizar la modalidad
        let modalidad = rawModalidad
        if (rawModalidad.trim().toUpperCase() === "CONTADO") {
          modalidad = "Pago Total"
        } else if (rawModalidad.trim().toUpperCase() === "DOS CUOTAS") {
          modalidad = "Cuotas"
        }

        // Calcular monto de cuotas si aplica
        let montoCuota = ""
        if (modalidad.toLowerCase().includes("cuota")) {
          const totalNum = parseAmount(totalPagar)
          if (totalNum > 0) {
            const isDollar = totalPagar.includes("$")
            const half = totalNum / 2
            montoCuota = isDollar
              ? `$${half.toFixed(2)}`
              : `Bs. ${half.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          }
        }

        hoja3Loans.push({
          fechaRegistro,
          modalidad,
          monto,
          montoCuota,
          fechasPago,
          totalPagar,
          tasaBCV: "N/A",
          estado,
          mora,
          observacion,
          source: "Carga manual",
        })
      }
    }

    // Unificar y ordenar por fecha (más reciente primero)
    const combinedLoans = [...userLoans, ...hoja3Loans]
    combinedLoans.sort((a, b) => {
      return parseVenezuelaTimestamp(b.fechaRegistro) - parseVenezuelaTimestamp(a.fechaRegistro)
    })

    const { searchParams } = new URL(req.url)
    const includeAll = searchParams.get("all") === "true"

    // Solo devolver préstamos que no estén completados (no pagados ni rechazados), a menos que se solicite todo
    const loansToReturn = includeAll
      ? combinedLoans
      : combinedLoans.filter(
          (loan) =>
            loan.estado.toLowerCase() !== "pagado" &&
            loan.estado.toLowerCase() !== "rechazado"
        )

    // Calcular nivel basándose en todos los préstamos pagados
    const paidLoans = combinedLoans.filter((loan) => loan.estado.toLowerCase() === "pagado")
    let totalPaidUsd = 0
    for (const loan of paidLoans) {
      totalPaidUsd += getLoanAmountInUsd(loan.monto, loan.fechaRegistro, loan.tasaBCV)
    }

    const level = Math.min(9, Math.floor(totalPaidUsd / 50) + 1)
    
    const animalMap: Record<number, string> = {
      1: "caracol",
      2: "iguana",
      3: "guacamaya",
      4: "cachicamo",
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
      4: "Cachicamo",
      5: "Chigüire",
      6: "Venado",
      7: "Águila Arpía",
      8: "Caimán",
      9: "Jaguar",
    }

    const levelInfo = {
      totalPaidUsd,
      level,
      animal: animalMap[level] || "caracol",
      animalName: animalNames[level] || "Caracol",
      badgeUrl: `/images/levels/${animalMap[level] || "caracol"}.png`
    }

    return NextResponse.json({ loans: loansToReturn, levelInfo })
  } catch (error) {
    console.error("Error al obtener préstamos del usuario:", error)
    return NextResponse.json({ loans: [] }, { status: 500 })
  }
}
