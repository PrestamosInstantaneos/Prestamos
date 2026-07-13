"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import {
  Users,
  DollarSign,
  TrendingUp,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  KeyRound,
  RefreshCw,
  PlusCircle,
  UserCheck,
  Image as ImageIcon,
  Copy,
  Check
} from "lucide-react"

// Helper to parse currency amounts in Venezuelan format (Bs. 1.234,56 or Bs.1234)
function parseAmount(valStr: string): number {
  if (!valStr) return 0
  try {
    const clean = valStr
      .replace(/Bs\./g, "")
      .replace(/[^0-9,.]/g, "")
      .replace(/\s/g, "")
    const cleanNumberString = clean.replace(/\./g, "").replace(/,/g, ".")
    const num = parseFloat(cleanNumberString)
    return isNaN(num) ? 0 : num
  } catch (e) {
    return 0
  }
}

function parseAmountToVES(valStr: string, bcvRateOfLoan: number = 40.0): number {
  if (!valStr) return 0
  try {
    const isUsd = valStr.includes("$")
    const isEur = valStr.includes("€")
    const clean = valStr
      .replace(/Bs\./g, "")
      .replace(/\$/g, "")
      .replace(/€/g, "")
      .replace(/[^0-9,.]/g, "")
      .replace(/\s/g, "")
    const cleanNumberString = clean.replace(/\./g, "").replace(/,/g, ".")
    let num = parseFloat(cleanNumberString)
    if (isNaN(num)) return 0
    if (isUsd) {
      num = num * bcvRateOfLoan
    } else if (isEur) {
      num = num * (bcvRateOfLoan * 1.08)
    }
    return num
  } catch (e) {
    return 0
  }
}

function parseAmountToFloat(valStr: string): number {
  if (!valStr) return 0
  try {
    const clean = valStr
      .replace(/Bs\./g, "")
      .replace(/\$/g, "")
      .replace(/€/g, "")
      .replace(/[a-zA-Z]/g, "")
      .replace(/\s/g, "")
      .replace(/^\.+/, "")
      .trim()
    if (!clean) return 0
    if (clean.includes(".") && clean.includes(",")) {
      if (clean.indexOf(".") < clean.indexOf(",")) {
        return parseFloat(clean.replace(/\./g, "").replace(",", ".")) || 0
      } else {
        return parseFloat(clean.replace(/,/g, "")) || 0
      }
    } else if (clean.includes(",")) {
      const parts = clean.split(",")
      if (parts[parts.length - 1].length === 3) {
        return parseFloat(clean.replace(/,/g, "")) || 0
      } else {
        return parseFloat(clean.replace(",", ".")) || 0
      }
    } else if (clean.includes(".")) {
      const parts = clean.split(".")
      if (parts.length > 2 || parts[parts.length - 1].length === 3) {
        return parseFloat(clean.replace(/\./g, "")) || 0
      } else {
        return parseFloat(clean) || 0
      }
    }
    return parseFloat(clean) || 0
  } catch (e) {
    return 0
  }
}

// Fetcher for SWR
const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.message || "Error al cargar datos")
  }
  return res.json()
}

export default function AdminDashboard() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<"stats" | "users" | "loans" | "manual">("stats")

  // Verification checks on load
  useEffect(() => {
    const stored = localStorage.getItem("user")
    if (!stored) {
      setAuthorized(false)
      return
    }
    try {
      const parsedUser = JSON.parse(stored)
      setUser(parsedUser)
      const cleanPhone = parsedUser.telefono.replace(/\D/g, "").slice(-10)
      if (cleanPhone === "4125654081") {
        setAuthorized(true)
      } else {
        setAuthorized(false)
      }
    } catch {
      setAuthorized(false)
    }
  }, [])

  // BCV Rate SWR
  const { data: bcvData } = useSWR("/api/bcv-rate", fetcher, { revalidateOnFocus: false })
  const bcvRate = bcvData?.usd || 40.0 // Default fallback



  // Admin Data SWR
  const { data, error, mutate, isValidating } = useSWR(
    authorized ? "/api/admin/data" : null,
    fetcher,
    {
      refreshInterval: 15000, // Refresh every 15 seconds
      revalidateOnFocus: true,
    }
  )

  // Handle unauthorized SWR requests
  useEffect(() => {
    if (error) {
      console.error("Admin data error:", error)
      setAuthorized(false)
    }
  }, [error])

  // Sub-states: User Detail Modal
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [verificando, setVerificando] = useState<string>("NO_VERIFICADA")
  const [verificacionMotivo, setVerificacionMotivo] = useState("")
  const [savingUserVerify, setSavingUserVerify] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  // Sub-states: Password Reset Link Generator
  const [resetPhone, setResetPhone] = useState("")
  const [generatedLink, setGeneratedLink] = useState("")
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [copiedResetLink, setCopiedResetLink] = useState(false)

  // Sub-states: Manual Loan Form
  const [isManualLoanModalOpen, setIsManualLoanModalOpen] = useState(false)
  const [manualClientSelected, setManualClientSelected] = useState("") // selected client's telefono
  const [manualClientSearch, setManualClientSearch] = useState("")
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false)
  const [manualMonto, setManualMonto] = useState("")
  const [manualMoneda, setManualMoneda] = useState("Bs.")
  const [manualModalidad, setManualModalidad] = useState("Pago Total")
  const [manualInteres, setManualInteres] = useState("54") // Default 54% interest
  const [manualFechas, setManualFechas] = useState("")
  const [manualCustomTotal, setManualCustomTotal] = useState("")
  const [manualEstado, setManualEstado] = useState("Aprobado")
  const [manualSubmitting, setManualSubmitting] = useState(false)
  const [manualError, setManualError] = useState<string | null>(null)
  const [manualSuccess, setManualSuccess] = useState<string | null>(null)

  // Sub-states: Edit Loan Details Form
  const [isEditLoanModalOpen, setIsEditLoanModalOpen] = useState(false)
  const [editingLoan, setEditingLoan] = useState<any | null>(null)
  const [editMonto, setEditMonto] = useState("")
  const [editTotalPagar, setEditTotalPagar] = useState("")
  const [editModalidad, setEditModalidad] = useState("Pago Total")
  const [editFechas, setEditFechas] = useState("")
  const [editReferencia, setEditReferencia] = useState("")
  const [editEstado, setEditEstado] = useState("Aprobado")
  const [editMonedaMonto, setEditMonedaMonto] = useState("Bs.")
  const [editMonedaDeuda, setEditMonedaDeuda] = useState("Bs.")
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSuccess, setEditSuccess] = useState<string | null>(null)
  const [convAmount, setConvAmount] = useState("")
  const [convFrom, setConvFrom] = useState("USD")
  const [convTo, setConvTo] = useState("VES")

  // Sub-states: WhatsApp Client Registration Form
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false)
  const [waNombres, setWaNombres] = useState("")
  const [waApellidos, setWaApellidos] = useState("")
  const [waCedula, setWaCedula] = useState("")
  const [waTelefono, setWaTelefono] = useState("")
  const [waProfesion, setWaProfesion] = useState("")
  const [waDiasCobro, setWaDiasCobro] = useState("")
  const [waTrabajando, setWaTrabajando] = useState("Sí")
  const [waCiudad, setWaCiudad] = useState("")
  const [waMunicipio, setWaMunicipio] = useState("")
  const [waCalle, setWaCalle] = useState("")
  const [waReferencias, setWaReferencias] = useState("")
  const [waSubmitting, setWaSubmitting] = useState(false)
  const [waError, setWaError] = useState<string | null>(null)
  const [waSuccess, setWaSuccess] = useState<string | null>(null)

  // Sub-states: Dollar History & Projections
  const [bcvHistory, setBcvHistory] = useState<any[]>([])
  const [bcvAnalysis, setBcvAnalysis] = useState<any>(null)
  const [loadingBcvHistory, setLoadingBcvHistory] = useState(true)

  // Sub-states: Dynamic Interest settings
  const [interestConfig, setInterestConfig] = useState<any>({
    Tasa_Interes_Base: 54,
    Interes_Nivel_1: 54,
    Interes_Nivel_2: 52,
    Interes_Nivel_3: 50,
    Interes_Nivel_4: 48,
    Interes_Nivel_5: 46,
    Interes_Nivel_6: 44,
    Interes_Nivel_7: 42,
    Interes_Nivel_8: 40,
    Interes_Nivel_9: 38,
  })
  const [savingConfig, setSavingConfig] = useState(false)
  const [configSuccess, setConfigSuccess] = useState<string | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)

  // Sub-states: Capital Base & Working Capital (USD)
  const [customCapitalBase, setCustomCapitalBase] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("admin_capital_base")
      return stored ? parseFloat(stored) : null
    }
    return null
  })
  const [isEditingCapital, setIsEditingCapital] = useState(false)
  const [tempCapital, setTempCapital] = useState("")

  // Sub-states: Payment Receipt Verification Modal with OCR
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedPaymentLoan, setSelectedPaymentLoan] = useState<any | null>(null)
  const [paymentReferencia, setPaymentReferencia] = useState("")
  const [paymentComprobanteBase64, setPaymentComprobanteBase64] = useState("")
  const [skipComprobante, setSkipComprobante] = useState(false)
  const [paymentMoneda, setPaymentMoneda] = useState("Bs.")
  const [paymentNota, setPaymentNota] = useState("")
  const [isAbono, setIsAbono] = useState(false)
  const [paymentMontoAbono, setPaymentMontoAbono] = useState("")
  const [paymentOcrScanning, setPaymentOcrScanning] = useState(false)
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null)

  // Sub-states: Search and filters
  const [userSearch, setUserSearch] = useState("")
  const [userFilter, setUserFilter] = useState("all") // all, verified, unverified, whatsapp

  const [loanSearch, setLoanSearch] = useState("")
  const [loanFilter, setLoanFilter] = useState("all") // all, pendiente, aprobado, rechazado, pagado

  // Sub-states: Carga Manual Search and filters
  const [manualSearch, setManualSearch] = useState("")
  const [manualFilter, setManualFilter] = useState("all") // all, registered, unregistered

  // Action loading states
  const [updatingLoanId, setUpdatingLoanId] = useState<string | null>(null)

  // Helper lists from SWR data
  const users = data?.users || []
  const loans = data?.loans || []
  const manualLoans = data?.manualLoans || []

  const calculatedCapitalBase = useMemo(() => {
    let sumUsd = 0
    const cleanNum = (str: any) => {
      if (!str) return 0
      return parseFloat(str.toString().replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")) || 0
    }
    const parseDateStr = (dStr: string) => {
      if (!dStr) return null
      const clean = dStr.replace(/[^\d/:-]/g, "").trim()
      if (clean.includes("/") && clean.split("/").length >= 3) {
        const pts = clean.split("/")
        let year = parseInt(pts[2].split(" ")[0])
        if (year < 100) year += 2000
        if (year === 2025) year = 2026 // Normalizar
        return new Date(year, parseInt(pts[1]) - 1, parseInt(pts[0]))
      }
      const parsed = Date.parse(clean)
      if (isNaN(parsed)) return null
      const date = new Date(parsed)
      if (date.getFullYear() === 2025) date.setFullYear(2026)
      return date
    }

    const getHistoricalRateLocal = (date: Date) => {
      const dateStr = date.toISOString().split("T")[0]
      const match = bcvHistory.find((h: any) => h.fecha === dateStr)
      if (match) return parseFloat(match.tasa) || bcvRate || 40.0
      
      let closest = null
      let minDiff = Infinity
      bcvHistory.forEach((h: any) => {
        const hDate = new Date(h.fecha)
        const diff = Math.abs(date.getTime() - hDate.getTime())
        if (diff < minDiff) {
          minDiff = diff
          closest = parseFloat(h.tasa)
        }
      })
      return closest || bcvRate || 40.0
    }

    // Web loans (Solicitudes) from May 23 to May 31 (month = 4)
    loans.forEach((l: any) => {
      const date = parseDateStr(l.timestamp)
      if (date && date.getMonth() === 4 && date.getDate() >= 23 && date.getDate() <= 31) {
        const state = (l.estado || "").toLowerCase()
        if (state === "pagado" || state === "pagando" || state === "aprobado" || state === "por pagar" || state === "pendiente por pagar") {
          const rate = parseFloat(l.bcvRate?.toString().replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".")) || bcvRate || 40.0
          const base = parseAmountToVES(l.monto, rate)
          sumUsd += base / rate
        }
      }
    })

    // Manual loans (Carga manual) from May 23 to May 31 (month = 4)
    manualLoans.forEach((ml: any) => {
      const date = parseDateStr(ml.fechaSolicitud)
      if (date && date.getMonth() === 4 && date.getDate() >= 23 && date.getDate() <= 31) {
        const state = (ml.estado || "").toLowerCase()
        if (state === "pagado" || state === "pagando" || state === "aprobado" || state === "por pagar" || state === "pendiente por pagar") {
          const rate = getHistoricalRateLocal(date)
          const base = parseAmountToVES(ml.montoSolicitado, rate)
          sumUsd += base / rate
        }
      }
    })

    return sumUsd > 0 ? sumUsd : 1000.0
  }, [loans, manualLoans, bcvRate, bcvHistory])

  const capitalBase = customCapitalBase !== null ? customCapitalBase : calculatedCapitalBase

  useEffect(() => {
    setTempCapital(capitalBase.toString())
  }, [capitalBase])

  // Memo para agrupar y analizar solicitantes de la Carga Manual
  const uniqueManualApplicants = useMemo(() => {
    const map = new Map<string, any>()
    manualLoans.forEach((ml: any) => {
      const key = ml.solicitante.trim()
      if (!key || key.toLowerCase() === "solicitantes") return
      
      if (!map.has(key)) {
        // Buscar si coincide con un usuario registrado
        let matchedUser = null
        const normalizedKey = key.toLowerCase().replace(/\s/g, "")
        
        // Intentar buscar por cédula (si es numérico o contiene números)
        const isNumericKey = /^\d+$/.test(normalizedKey) || (normalizedKey.length >= 6 && /\d{6,}/.test(normalizedKey))
        
        if (isNumericKey) {
          const numbersOnly = normalizedKey.replace(/\D/g, "")
          matchedUser = users.find((u: any) => {
            const userCedulaClean = u.cedula.replace(/\D/g, "")
            return userCedulaClean && userCedulaClean.includes(numbersOnly)
          })
        }
        
        // Si no se encuentra por cédula, intentar por nombre
        if (!matchedUser) {
          matchedUser = users.find((u: any) => {
            const userNameClean = `${u.nombres} ${u.apellidos}`.toLowerCase().replace(/\s/g, "")
            return userNameClean.includes(normalizedKey) || normalizedKey.includes(userNameClean)
          })
        }
        
        map.set(key, {
          nombreOriginal: key,
          loansCount: 1,
          totalMonto: parseFloat(ml.montoSolicitado.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")) || 0,
          totalDeuda: parseFloat(ml.deuda.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")) || 0,
          matchedUser: matchedUser || null,
          isRegistered: !!matchedUser,
          loansList: [ml]
        })
      } else {
        const item = map.get(key)
        item.loansCount += 1
        item.totalMonto += parseFloat(ml.montoSolicitado.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")) || 0
        item.totalDeuda += parseFloat(ml.deuda.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")) || 0
        item.loansList.push(ml)
      }
    })
    
    return Array.from(map.values())
  }, [manualLoans, users])

  // Filtrado de solicitantes de Carga Manual
  const filteredManualApplicants = useMemo(() => {
    return uniqueManualApplicants.filter((ma: any) => {
      const search = manualSearch.toLowerCase().trim()
      const matchesSearch = search === "" || ma.nombreOriginal.toLowerCase().includes(search)
      
      const matchesFilter =
        manualFilter === "all" ||
        (manualFilter === "registered" && ma.isRegistered) ||
        (manualFilter === "unregistered" && !ma.isRegistered)
        
      return matchesSearch && matchesFilter
    })
  }, [uniqueManualApplicants, manualSearch, manualFilter])

  // Abre el modal de registro WhatsApp prellenado para un solicitante
  const openManualRegisterForWhatsApp = (applicant: any) => {
    setWaNombres("")
    setWaApellidos("")
    setWaCedula("")
    setWaTelefono("")
    setWaProfesion("")
    setWaDiasCobro("")
    setWaTrabajando("Sí")
    setWaCiudad("")
    setWaMunicipio("")
    setWaCalle("")
    setWaReferencias("")
    
    const name = applicant.nombreOriginal
    const isNumeric = /^\d+$/.test(name) || (name.length >= 6 && /\d{6,}/.test(name))
    
    if (isNumeric) {
      setWaCedula(name.replace(/\D/g, ""))
    } else {
      setWaNombres(name)
    }
    
    setIsWhatsAppModalOpen(true)
  }

  // Memo para calcular el historial consolidado de créditos (Web + Carga Manual) de un cliente específico
  const combinedUserLoans = useMemo(() => {
    if (!selectedUser) return []
    
    const userCedulaClean = selectedUser.cedula.replace(/\D/g, "")
    const userPhoneClean = selectedUser.telefono.replace(/\D/g, "")
    const userNameClean = `${selectedUser.nombres} ${selectedUser.apellidos}`.toLowerCase().replace(/\s/g, "")

    // Filtrar créditos web
    const web = loans
      .filter((l: any) => {
        const lCedula = l.cedula.replace(/\D/g, "")
        const lPhone = l.telefono.replace(/\D/g, "")
        return (lCedula && lCedula === userCedulaClean) || (lPhone && lPhone === userPhoneClean)
      })
      .map((l: any) => ({
        source: "Web",
        fechaSolicitud: l.timestamp.includes(",") ? l.timestamp.split(",")[0] : l.timestamp,
        fechaPago: l.estado.toLowerCase() === "pagado" ? (l.fechas || l.timestamp.split(",")[0]) : "-",
        modalidad: l.modalidad || "CONTADO",
        monto: l.monto.toString().includes("Bs") || l.monto.toString().includes("$") || l.monto.toString().includes("€") ? l.monto : `Bs. ${parseFloat(l.monto).toLocaleString("es-VE", { minimumFractionDigits: 2 })}`,
        totalPagar: l.totalPagar.toString().includes("Bs") || l.totalPagar.toString().includes("$") || l.totalPagar.toString().includes("€") ? l.totalPagar : `Bs. ${parseFloat(l.totalPagar).toLocaleString("es-VE", { minimumFractionDigits: 2 })}`,
        estado: l.estado,
        referencia: l.referencia || "N/A",
        comprobanteLink: l.comprobanteLink || "",
        mora: "N/A",
        comentario: l.referencia ? `Ref: ${l.referencia}` : "N/A",
        notaPago: l.notaPago || "",
        monedaPago: l.monedaPago || ""
      }))

    // Filtrar créditos de carga manual
    const manual = manualLoans
      .filter((ml: any) => {
        const solicitanteClean = ml.solicitante.trim().toLowerCase().replace(/\s/g, "")
        if (!solicitanteClean) return false
        
        const isNumeric = /^\d+$/.test(solicitanteClean) || (solicitanteClean.length >= 6 && /\d{6,}/.test(solicitanteClean))
        if (isNumeric) {
          const numOnly = solicitanteClean.replace(/\D/g, "")
          return userCedulaClean.includes(numOnly) || numOnly.includes(userCedulaClean)
        }
        
        return solicitanteClean.includes(userNameClean) || userNameClean.includes(solicitanteClean)
      })
      .map((ml: any) => ({
        source: "WhatsApp / Manual",
        fechaSolicitud: ml.fechaSolicitud || "-",
        fechaPago: ml.fechaPago || "-",
        modalidad: ml.modalidad || "CONTADO",
        monto: ml.montoSolicitado.toString().includes("Bs") || ml.montoSolicitado.toString().includes("$") || ml.montoSolicitado.toString().includes("€") ? ml.montoSolicitado : `Bs. ${parseFloat(ml.montoSolicitado).toLocaleString("es-VE", { minimumFractionDigits: 2 })}`,
        totalPagar: ml.deuda.toString().includes("Bs") || ml.deuda.toString().includes("$") || ml.deuda.toString().includes("€") ? ml.deuda : `Bs. ${parseFloat(ml.deuda).toLocaleString("es-VE", { minimumFractionDigits: 2 })}`,
        estado: ml.estado,
        referencia: ml.referencia || "N/A",
        comprobanteLink: ml.comprobanteLink || "",
        mora: ml.mora || "N/A",
        comentario: ml.mora && ml.mora !== "N/A" ? `Mora: ${ml.mora}` : "N/A",
        notaPago: ml.notaPago || "",
        monedaPago: ml.monedaPago || ""
      }))

    const combined = [...web, ...manual]
    
    // Ordenar por fecha de pago (si está pagado) o fecha de solicitud descendente
    combined.sort((a, b) => {
      const parseDate = (dStr: string) => {
        if (!dStr || dStr === "-" || dStr === "N/A") return 0
        const clean = dStr.replace(/[^\d/:-]/g, "").trim()
        if (clean.includes("/") && clean.split("/").length >= 3) {
          const pts = clean.split("/")
          let year = parseInt(pts[2].split(" ")[0])
          if (year < 100) year += 2000
          return new Date(year, parseInt(pts[1]) - 1, parseInt(pts[0])).getTime()
        }
        const parsed = Date.parse(clean)
        return isNaN(parsed) ? 0 : parsed
      }
      
      const dateA = a.fechaPago !== "-" ? a.fechaPago : a.fechaSolicitud
      const dateB = b.fechaPago !== "-" ? b.fechaPago : b.fechaSolicitud
      return parseDate(dateB) - parseDate(dateA)
    })

    return combined
  }, [selectedUser, loans, manualLoans])

  // Memo para agrupar cobros en ciclos de inversión quincenales y graficar/analizar el crecimiento del capital
  const investmentCycles = useMemo(() => {
    const paidList: { date: Date; interestUsd: number }[] = []

    const cleanNum = (str: any) => {
      if (!str) return 0
      return parseFloat(str.toString().replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")) || 0
    }

    const getHistoricalRate = (date: Date) => {
      const dateStr = date.toISOString().split("T")[0]
      const match = bcvHistory.find((h: any) => h.fecha === dateStr)
      if (match) return parseFloat(match.tasa) || bcvRate || 40.0
      
      let closest = null
      let minDiff = Infinity
      bcvHistory.forEach((h: any) => {
        const hDate = new Date(h.fecha)
        const diff = Math.abs(date.getTime() - hDate.getTime())
        if (diff < minDiff) {
          minDiff = diff
          closest = parseFloat(h.tasa)
        }
      })
      return closest || bcvRate || 40.0
    }

    const parseDateStr = (dStr: string) => {
      if (!dStr) return null
      const clean = dStr.replace(/[^\d/:-]/g, "").trim()
      if (clean.includes("/") && clean.split("/").length >= 3) {
        const pts = clean.split("/")
        let year = parseInt(pts[2].split(" ")[0])
        if (year < 100) year += 2000
        if (year === 2025) year = 2026 // Normalizar
        return new Date(year, parseInt(pts[1]) - 1, parseInt(pts[0]))
      }
      const parsed = Date.parse(clean)
      if (isNaN(parsed)) return null
      const date = new Date(parsed)
      if (date.getFullYear() === 2025) date.setFullYear(2026)
      return date
    }

    // Procesar préstamos web cobrados
    loans.forEach((l: any) => {
      if (l.estado.toLowerCase() === "pagado") {
        const date = parseDateStr(l.timestamp)
        if (date) {
          const rate = cleanNum(l.bcvRate) || bcvRate || 40.0
          const montoBs = cleanNum(l.monto)
          const totalBs = cleanNum(l.totalPagar)
          const interestBs = totalBs - montoBs
          const interestUsd = rate > 0 ? interestBs / rate : 0
          paidList.push({ date, interestUsd })
        }
      }
    })

    // Procesar préstamos de carga manual cobrados
    manualLoans.forEach((ml: any) => {
      if (ml.estado.toLowerCase() === "pagado") {
        const date = parseDateStr(ml.fechaPago || ml.fechaSolicitud)
        if (date) {
          const rate = getHistoricalRate(date)
          const montoBs = cleanNum(ml.montoSolicitado)
          const deudaBs = cleanNum(ml.deuda)
          const interestBs = deudaBs - montoBs
          const interestUsd = rate > 0 ? interestBs / rate : 0
          paidList.push({ date, interestUsd })
        }
      }
    })

    if (paidList.length === 0) return []

    // Ordenar cronológicamente
    paidList.sort((a, b) => a.date.getTime() - b.date.getTime())

    // Ciclos de inversión quincenales personalizados
    const today = new Date()
    const cycles: {
      name: string
      startDate: Date
      endDate: Date
      startCapital: number
      earnings: number
      endCapital: number
      growthPct: number
    }[] = []

    // Primer Ciclo Especial: 23 de Mayo de 2026 al 31 de Mayo de 2026
    const initialStart = new Date(2026, 4, 23, 0, 0, 0, 0)
    const initialEnd = new Date(2026, 4, 31, 23, 59, 59, 999)

    let currentCapital = capitalBase

    // Filtrar cobros del ciclo inicial
    const cyclePaid1 = paidList.filter(
      (p) => p.date.getTime() >= initialStart.getTime() && p.date.getTime() <= initialEnd.getTime()
    )
    const earnings1 = cyclePaid1.reduce((acc, p) => acc + p.interestUsd, 0)
    const endCapital1 = currentCapital + earnings1
    const growthPct1 = currentCapital > 0 ? (earnings1 / currentCapital) * 100 : 0

    cycles.push({
      name: "Ciclo Inicial (23 al 31 de Mayo)",
      startDate: new Date(initialStart),
      endDate: new Date(initialEnd),
      startCapital: currentCapital,
      earnings: earnings1,
      endCapital: endCapital1,
      growthPct: growthPct1,
    })

    currentCapital = endCapital1
    // Próximo ciclo empieza el 1 de Junio de 2026
    let currentStart = new Date(2026, 5, 1, 0, 0, 0, 0)

    while (currentStart.getTime() <= today.getTime()) {
      let currentEnd = new Date(currentStart)
      if (currentStart.getDate() === 1) {
        currentEnd.setDate(15)
      } else {
        currentEnd.setMonth(currentEnd.getMonth() + 1)
        currentEnd.setDate(0)
      }
      currentEnd.setHours(23, 59, 59, 999)

      if (currentStart.getTime() > today.getTime()) {
        break
      }

      // Cobros acumulados en esta quincena
      const cyclePaid = paidList.filter(
        (p) => p.date.getTime() >= currentStart.getTime() && p.date.getTime() <= currentEnd.getTime()
      )
      const earnings = cyclePaid.reduce((acc, p) => acc + p.interestUsd, 0)
      const endCapital = currentCapital + earnings
      const growthPct = currentCapital > 0 ? (earnings / currentCapital) * 100 : 0

      const quincenaLabel = currentStart.getDate() === 1 ? "1ra Quincena" : "2da Quincena"
      const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
      const cycleName = `${quincenaLabel} de ${monthNames[currentStart.getMonth()]} ${currentStart.getFullYear()}`

      cycles.push({
        name: cycleName,
        startDate: new Date(currentStart),
        endDate: new Date(currentEnd),
        startCapital: currentCapital,
        earnings,
        endCapital,
        growthPct,
      })

      currentCapital = endCapital
      currentStart = new Date(currentEnd)
      currentStart.setDate(currentStart.getDate() + 1)
      currentStart.setHours(0, 0, 0, 0)
    }

    return cycles.reverse()
  }, [loans, manualLoans, bcvHistory, bcvRate, capitalBase])

  // Helper to calculate user level and total paid volume dynamically in frontend
  const getUserLevelInfo = useMemo(() => {
    return (userObj: any) => {
      if (!userObj || !loans || loans.length === 0) return { level: 1, totalPaidUsd: 0 }
      const userCedulaClean = userObj.cedula.trim().toLowerCase()
      const userLoans = loans.filter((l: any) => l.cedula.trim().toLowerCase() === userCedulaClean)
      const paidLoans = userLoans.filter((l: any) => l.estado.trim().toLowerCase() === "pagado")
      
      let totalPaidUsd = 0
      paidLoans.forEach((loan: any) => {
        const baseClean = parseFloat(loan.monto.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")) || 0
        const rateClean = parseFloat(loan.bcvRate.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")) || bcvRate || 40.0
        totalPaidUsd += rateClean > 0 ? baseClean / rateClean : 0
      })
      
      const level = Math.min(9, Math.floor(totalPaidUsd / 50) + 1)
      return { level, totalPaidUsd }
    }
  }, [loans, bcvRate])

  // Fetch dollar history and dynamic config when authorized is true
  useEffect(() => {
    if (authorized) {
      const loadHistoryAndConfig = async () => {
        try {
          setLoadingBcvHistory(true)
          const resHistory = await fetch("/api/admin/bcv-history")
          const dataHistory = await resHistory.json()
          if (dataHistory.success) {
            setBcvHistory(dataHistory.history)
            setBcvAnalysis(dataHistory.analysis)
          }

          const resConfig = await fetch("/api/config")
          const dataConfig = await resConfig.json()
          if (dataConfig.success && dataConfig.config) {
            setInterestConfig(dataConfig.config)
          }
        } catch (err) {
          console.error("Error al inicializar datos:", err)
        } finally {
          setLoadingBcvHistory(false)
        }
      }
      loadHistoryAndConfig()
    }
  }, [authorized])

  // Prefill dynamic interest based on level when manual client changes
  useEffect(() => {
    if (manualClientSelected && users.length > 0) {
      const client = users.find((u: any) => u.telefono === manualClientSelected)
      if (client) {
        const { level } = getUserLevelInfo(client)
        const rateForLevel = interestConfig[`Interes_Nivel_${level}`] || interestConfig.Tasa_Interes_Base || 54
        setManualInteres(rateForLevel.toString())
      }
    }
  }, [manualClientSelected, users, interestConfig, getUserLevelInfo])

  // Guardar configuración de intereses
  const handleSaveInterestConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingConfig(true)
    setConfigSuccess(null)
    setConfigError(null)
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: interestConfig }),
      })
      const data = await res.json()
      if (data.success) {
        setConfigSuccess("Configuración de intereses guardada y aplicada en toda la plataforma.")
        setTimeout(() => setConfigSuccess(null), 5000)
      } else {
        setConfigError(data.message || "Error al guardar la configuración.")
      }
    } catch (err: any) {
      setConfigError(err.message || "Error de red.")
    } finally {
      setSavingConfig(false)
    }
  }

  // Pre-fill fields for manual loan form based on client selection
  const selectedManualClientObj = useMemo(() => {
    return users.find((u: any) => u.telefono === manualClientSelected) || null
  }, [manualClientSelected, users])

  // Filtrado de clientes para el dropdown interactivo de préstamo manual
  const filteredManualDropdownClients = useMemo(() => {
    const search = manualClientSearch.toLowerCase().trim()
    const sorted = [...users].sort((a: any, b: any) => a.nombres.localeCompare(b.nombres))
    
    if (search === "") return sorted

    return sorted.filter((u: any) => {
      return (
        `${u.nombres} ${u.apellidos}`.toLowerCase().includes(search) ||
        u.cedula.includes(search) ||
        u.telefono.includes(search)
      )
    })
  }, [users, manualClientSearch])

  // Auto-calculated Total to Pay for Manual Loan
  const computedManualTotal = useMemo(() => {
    if (manualCustomTotal.trim() !== "") {
      return parseFloat(manualCustomTotal) || 0
    }
    const base = parseFloat(manualMonto) || 0
    const pct = parseFloat(manualInteres) || 0
    return base + (base * pct) / 100
  }, [manualMonto, manualInteres, manualCustomTotal])

  // Auto-calculated installment cuota for Manual Loan
  const computedManualCuota = useMemo(() => {
    if (manualModalidad === "Cuotas") {
      return computedManualTotal / 2
    }
    return 0
  }, [manualModalidad, computedManualTotal])

  // Filtered lists
  const filteredUsers = useMemo(() => {
    return users.filter((u: any) => {
      const search = userSearch.toLowerCase().trim()
      const matchesSearch =
        search === "" ||
        `${u.nombres} ${u.apellidos}`.toLowerCase().includes(search) ||
        u.cedula.includes(search) ||
        u.telefono.includes(search)

      const matchesFilter =
        userFilter === "all" ||
        (userFilter === "verified" && u.verificado === "VERIFICADA") ||
        (userFilter === "unverified" && u.verificado !== "VERIFICADA" && u.verificado !== "WHATSAPP") ||
        (userFilter === "whatsapp" && u.verificado === "WHATSAPP")

      return matchesSearch && matchesFilter
    })
  }, [users, userSearch, userFilter])

  // Helper simple para formatear números de Bs en texto legible
  const cleanNumFormat = (str: any) => {
    if (!str) return "0"
    const parsed = parseFloat(str.toString().replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")) || 0
    return parsed.toLocaleString("es-VE", { minimumFractionDigits: 0 })
  }

  // Combinación y unificación de todos los créditos de la plataforma (Web + WhatsApp/Manual)
  const allLoansUnified = useMemo(() => {
    const web = loans.map((l: any) => ({
      ...l,
      source: "Web",
      isManual: false,
      monto: l.monto.toString().includes("Bs") || l.monto.toString().includes("$") || l.monto.toString().includes("€") ? l.monto : `Bs. ${parseFloat(l.monto).toLocaleString("es-VE", { minimumFractionDigits: 0 })}`,
      totalPagar: l.totalPagar.toString().includes("Bs") || l.totalPagar.toString().includes("$") || l.totalPagar.toString().includes("€") ? l.totalPagar : `Bs. ${parseFloat(l.totalPagar).toLocaleString("es-VE", { minimumFractionDigits: 2 })}`,
      notaPago: l.notaPago || "",
      monedaPago: l.monedaPago || ""
    }))

    const manual = manualLoans.map((ml: any) => {
      const key = ml.solicitante.trim()
      let nombres = key
      let apellidos = ""
      let cedula = "N/A"
      let telefono = "N/A"
      
      const normalizedKey = key.toLowerCase().replace(/\s/g, "")
      const isNumericKey = /^\d+$/.test(normalizedKey) || (normalizedKey.length >= 6 && /\d{6,}/.test(normalizedKey))
      
      let matchedUser = null
      if (isNumericKey) {
        const numbersOnly = normalizedKey.replace(/\D/g, "")
        matchedUser = users.find((u: any) => u.cedula.replace(/\D/g, "").includes(numbersOnly))
      } else {
        matchedUser = users.find((u: any) => {
          const userNameClean = `${u.nombres} ${u.apellidos}`.toLowerCase().replace(/\s/g, "")
          return userNameClean.includes(normalizedKey) || normalizedKey.includes(userNameClean)
        })
      }

      if (matchedUser) {
        nombres = matchedUser.nombres
        apellidos = matchedUser.apellidos
        cedula = matchedUser.cedula
        telefono = matchedUser.telefono
      } else {
        if (isNumericKey) {
          cedula = key
          nombres = "Cliente WhatsApp"
        }
      }

      return {
        timestamp: ml.fechaSolicitud || ml.fechaPago || "N/A",
        nombres,
        apellidos,
        cedula,
        telefono,
        modalidad: ml.modalidad || "CONTADO",
        monto: ml.montoSolicitado.toString().includes("Bs") || ml.montoSolicitado.toString().includes("$") || ml.montoSolicitado.toString().includes("€") ? ml.montoSolicitado : `Bs. ${cleanNumFormat(ml.montoSolicitado)}`,
        totalPagar: ml.deuda.toString().includes("Bs") || ml.deuda.toString().includes("$") || ml.deuda.toString().includes("€") ? ml.deuda : `Bs. ${cleanNumFormat(ml.deuda)}`,
        estado: ml.estado,
        referencia: ml.referencia || "N/A",
        comprobanteLink: ml.comprobanteLink || "",
        source: "WhatsApp / Manual",
        isManual: true,
        rowIndex: ml.rowIndex,
        notaPago: ml.notaPago || "",
        monedaPago: ml.monedaPago || ""
      }
    })

    const combined = [...web, ...manual]

    // Ordenar por fecha descendente
    combined.sort((a, b) => {
      const parseDate = (dStr: string) => {
        if (!dStr || dStr === "N/A") return 0
        const clean = dStr.replace(/[^\d/:-]/g, "").trim()
        if (clean.includes("/") && clean.split("/").length >= 3) {
          const pts = clean.split("/")
          let year = parseInt(pts[2].split(" ")[0])
          if (year < 100) year += 2000
          return new Date(year, parseInt(pts[1]) - 1, parseInt(pts[0])).getTime()
        }
        const parsed = Date.parse(clean)
        return isNaN(parsed) ? 0 : parsed
      }
      return parseDate(b.timestamp) - parseDate(a.timestamp)
    })

    return combined
  }, [loans, manualLoans, users])

  const filteredLoans = useMemo(() => {
    return allLoansUnified.filter((l: any) => {
      const search = loanSearch.toLowerCase().trim()
      const matchesSearch =
        search === "" ||
        `${l.nombres} ${l.apellidos}`.toLowerCase().includes(search) ||
        l.cedula.includes(search) ||
        l.telefono.includes(search)

      const matchesFilter =
        loanFilter === "all" ||
        l.estado.toLowerCase() === loanFilter.toLowerCase()

      return matchesSearch && matchesFilter
    })
  }, [allLoansUnified, loanSearch, loanFilter])

  // Statistics computations
  const stats = useMemo(() => {
    const totalUsersCount = users.length
    const verifiedUsersCount = users.filter((u: any) => u.verificado === "VERIFICADA").length
    const whatsappUsersCount = users.filter((u: any) => u.verificado === "WHATSAPP").length
    const unverifiedUsersCount = totalUsersCount - verifiedUsersCount - whatsappUsersCount

    const totalLoansCount = loans.length + manualLoans.length
    const pendingLoans = loans.filter((l: any) => l.estado.toLowerCase() === "pendiente")
    const approvedLoans = loans.filter((l: any) =>
      l.estado.toLowerCase() === "aprobado" ||
      l.estado.toLowerCase() === "por pagar" ||
      l.estado.toLowerCase() === "pendiente por pagar"
    )
    const paidLoans = loans.filter((l: any) => l.estado.toLowerCase() === "pagado")
    const rejectedLoans = loans.filter((l: any) => l.estado.toLowerCase() === "rechazado")

    const getHistoricalRateLocal = (date: Date) => {
      const dateStr = date.toISOString().split("T")[0]
      const match = bcvHistory.find((h: any) => h.fecha === dateStr)
      if (match) return parseFloat(match.tasa) || bcvRate || 40.0
      
      let closest = null
      let minDiff = Infinity
      bcvHistory.forEach((h: any) => {
        const hDate = new Date(h.fecha)
        const diff = Math.abs(date.getTime() - hDate.getTime())
        if (diff < minDiff) {
          minDiff = diff
          closest = parseFloat(h.tasa)
        }
      })
      return closest || bcvRate || 40.0
    }

    // Calculations of volumes and earnings
    let totalRequestedBs = 0
    let totalApprovedBs = 0
    let totalPaidBs = 0
    let totalInterestBs = 0 // totalPagar - monto (only for approved/paid)

    // Classified by Source: Web vs Manual (Admin)
    let webRequestedBs = 0
    let webApprovedBs = 0
    let webPaidBs = 0
    let webInterestBs = 0

    let manualRequestedBs = 0
    let manualApprovedBs = 0
    let manualPaidBs = 0
    let manualInterestBs = 0

    // Grouping by Month for growth chart
    const monthlyEarningsMap: { [key: string]: number } = {}

    // Process web loans
    loans.forEach((l: any) => {
      const rate = parseFloat(l.bcvRate?.toString().replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".")) || bcvRate || 40.0
      const base = parseAmountToVES(l.monto, rate)
      const pay = parseAmountToVES(l.totalPagar, rate)
      const state = l.estado.toLowerCase()
      const isManual = l.timestamp.includes("/") || !l.timestamp.includes("T")

      totalRequestedBs += base
      if (isManual) {
        manualRequestedBs += base
      } else {
        webRequestedBs += base
      }

      const isApprovedOrPaid = state === "aprobado" || state === "por pagar" || state === "pendiente por pagar" || state === "pagado"

      if (isApprovedOrPaid) {
        totalApprovedBs += base
        const interest = Math.max(0, pay - base)
        totalInterestBs += interest

        if (isManual) {
          manualApprovedBs += base
          manualInterestBs += interest
        } else {
          webApprovedBs += base
          webInterestBs += interest
        }

        // Grouping by month
        let dateObj = new Date()
        if (l.timestamp) {
          if (l.timestamp.includes("T")) {
            dateObj = new Date(l.timestamp)
          } else {
            const datePart = l.timestamp.split(",")[0]
            const parts = datePart.split("/")
            if (parts.length === 3) {
              dateObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
            }
          }
        }
        // Format: "Jul 26"
        const monthLabel = dateObj.toLocaleString("es-VE", { month: "short", year: "2-digit" })
        monthlyEarningsMap[monthLabel] = (monthlyEarningsMap[monthLabel] || 0) + (interest / bcvRate)
      }

      if (state === "pagado") {
        totalPaidBs += base
        if (isManual) {
          manualPaidBs += base
        } else {
          webPaidBs += base
        }
      }
    })

    // Process manualLoans
    manualLoans.forEach((ml: any) => {
      let dateObj = new Date()
      const dateStr = ml.fechaPago || ml.fechaSolicitud
      if (dateStr) {
        const clean = dateStr.replace(/[^\d/:-]/g, "").trim()
        if (clean.includes("/") && clean.split("/").length >= 3) {
          const pts = clean.split("/")
          let yr = parseInt(pts[2].split(" ")[0])
          if (yr < 100) yr += 2000
          if (yr === 2025) yr = 2026 // normalizar
          dateObj = new Date(yr, parseInt(pts[1]) - 1, parseInt(pts[0]))
        } else {
          const parsed = Date.parse(clean)
          if (!isNaN(parsed)) {
            dateObj = new Date(parsed)
            if (dateObj.getFullYear() === 2025) dateObj.setFullYear(2026)
          }
        }
      }

      const rate = getHistoricalRateLocal(dateObj)
      const base = parseAmountToVES(ml.montoSolicitado, rate)
      const pay = parseAmountToVES(ml.deuda, rate)
      const state = (ml.estado || "").toLowerCase()

      totalRequestedBs += base
      manualRequestedBs += base

      const isApprovedOrPaid = state === "aprobado" || state === "por pagar" || state === "pendiente por pagar" || state === "pagado" || state === "pagando"

      if (isApprovedOrPaid) {
        totalApprovedBs += base
        manualApprovedBs += base

        const interest = Math.max(0, pay - base)
        totalInterestBs += interest
        manualInterestBs += interest

        // Grouping by month
        const monthLabel = dateObj.toLocaleString("es-VE", { month: "short", year: "2-digit" })
        monthlyEarningsMap[monthLabel] = (monthlyEarningsMap[monthLabel] || 0) + (interest / bcvRate)
      }

      if (state === "pagado") {
        totalPaidBs += base
        manualPaidBs += base
      }
    })

    // Sort months chronologically
    const sortedMonths = Object.keys(monthlyEarningsMap).sort((a, b) => {
      const parseMonthStr = (s: string) => {
        const parts = s.split(" ")
        const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
        const cleanName = parts[0].replace(".", "").toLowerCase()
        const mIdx = monthNames.indexOf(cleanName)
        const yr = parseInt(parts[1]) || 0
        return yr * 12 + (mIdx >= 0 ? mIdx : 0)
      }
      return parseMonthStr(a) - parseMonthStr(b)
    })

    const monthlyEarnings = sortedMonths.map((m) => ({
      month: m,
      earningsUsd: monthlyEarningsMap[m],
    }))

    return {
      totalUsersCount,
      verifiedUsersCount,
      whatsappUsersCount,
      unverifiedUsersCount,
      totalLoansCount,
      pendingCount: pendingLoans.length,
      approvedCount: approvedLoans.length,
      paidCount: paidLoans.length,
      rejectedCount: rejectedLoans.length,
      totalRequestedBs,
      totalApprovedBs,
      totalPaidBs,
      totalInterestBs,
      totalRequestedUsd: totalRequestedBs / bcvRate,
      totalApprovedUsd: totalApprovedBs / bcvRate,
      totalPaidUsd: totalPaidBs / bcvRate,
      totalInterestUsd: totalInterestBs / bcvRate,
      // Source classified
      webRequestedUsd: webRequestedBs / bcvRate,
      webApprovedUsd: webApprovedBs / bcvRate,
      webPaidUsd: webPaidBs / bcvRate,
      webInterestUsd: webInterestBs / bcvRate,
      manualRequestedUsd: manualRequestedBs / bcvRate,
      manualApprovedUsd: manualApprovedBs / bcvRate,
      manualPaidUsd: manualPaidBs / bcvRate,
      manualInterestUsd: manualInterestBs / bcvRate,
      // Monthly earnings
      monthlyEarnings,
    }
  }, [users, loans, manualLoans, bcvRate, bcvHistory])

  // Handle loan status updates
  const handleUpdateLoanStatus = async (loan: any, newStatus: string) => {
    const confirmMsg = `¿Estás seguro de cambiar el estado de este préstamo de "${loan.estado}" a "${newStatus}"?`
    if (!confirm(confirmMsg)) return

    setUpdatingLoanId(`${loan.timestamp}-${loan.cedula}`)
    try {
      const res = await fetch("/api/admin/update-loan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timestamp: loan.timestamp,
          cedula: loan.cedula,
          estado: newStatus,
          isManual: loan.isManual || false,
          rowIndex: loan.rowIndex || undefined
        }),
      })

      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.message || "Error al actualizar préstamo")
      }

      mutate() // Refresh data
    } catch (err: any) {
      alert(err.message || "Error de red al actualizar préstamo")
    } finally {
      setUpdatingLoanId(null)
    }
  }

  // Handle deleting a loan/request
  const handleDeleteLoan = async (loan: any) => {
    const isManual = loan.isManual || false
    const displayName = isManual ? loan.solicitante : `${loan.nombres} ${loan.apellidos}`
    const confirmMessage = `¿Estás seguro de que deseas eliminar permanentemente el préstamo de "${displayName}" por un monto de "${loan.monto}"?\n\nEsta acción eliminará la fila de la hoja de cálculo de Google Sheets y no se puede deshacer.`
    
    if (!confirm(confirmMessage)) return

    setUpdatingLoanId(`${loan.timestamp}-${loan.cedula}`)
    try {
      const res = await fetch("/api/admin/delete-loan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isManual,
          rowIndex: loan.rowIndex,
          timestamp: loan.timestamp,
          cedula: loan.cedula
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || "Error al eliminar el préstamo.")
      }

      alert(data.message || "Préstamo eliminado con éxito.")
      mutate() // Refresh data
    } catch (err: any) {
      alert(err.message || "Error de red al eliminar el préstamo.")
    } finally {
      setUpdatingLoanId(null)
    }
  }

  // Handle registering WhatsApp client manually
  const handleRegisterWhatsAppClient = async (e: React.FormEvent) => {
    e.preventDefault()
    setWaError(null)
    setWaSuccess(null)

    if (!waNombres || !waApellidos || !waCedula || !waTelefono) {
      setWaError("Nombres, apellidos, cédula y teléfono son requeridos.")
      return
    }

    setWaSubmitting(true)
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombres: waNombres,
          apellidos: waApellidos,
          cedula: waCedula,
          telefono: waTelefono,
          profesion: waProfesion,
          diasCobro: waDiasCobro,
          trabajando: waTrabajando,
          ciudad: waCiudad,
          municipio: waMunicipio,
          calle: waCalle,
          referencias: waReferencias,
        }),
      })

      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.message || "Error al registrar cliente")
      }

      setWaSuccess("¡Cliente de WhatsApp registrado exitosamente!")
      mutate()

      // Reset fields
      setWaNombres("")
      setWaApellidos("")
      setWaCedula("")
      setWaTelefono("")
      setWaProfesion("")
      setWaDiasCobro("")
      setWaTrabajando("Sí")
      setWaCiudad("")
      setWaMunicipio("")
      setWaCalle("")
      setWaReferencias("")

      setTimeout(() => {
        setIsWhatsAppModalOpen(false)
        setWaSuccess(null)
      }, 1500)
    } catch (err: any) {
      setWaError(err.message || "Error de red al registrar cliente")
    } finally {
      setWaSubmitting(false)
    }
  }

  // Handle capital base update
  const handleUpdateCapitalBase = (newCapital: string) => {
    const parsed = parseFloat(newCapital)
    if (isNaN(parsed) || parsed < 0) {
      alert("El capital debe ser un número positivo.")
      return
    }
    setCapitalBase(parsed)
    localStorage.setItem("admin_capital_base", parsed.toString())
    setIsEditingCapital(false)
  }

  // Open Payment receipt modal
  const openPaymentVerificationModal = (loan: any) => {
    setSelectedPaymentLoan(loan)
    setPaymentReferencia(loan.referencia || "")
    setPaymentComprobanteBase64("")
    setPaymentError(null)
    setPaymentSuccess(null)
    setIsPaymentModalOpen(true)
  }

  // Handle payment file upload to base64
  const handleComprobanteFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setPaymentComprobanteBase64(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // OCR scan for payment receipt reference
  const handleScanReceiptOcr = async () => {
    if (!paymentComprobanteBase64) {
      alert("Por favor selecciona una imagen de comprobante primero.")
      return
    }
    setPaymentOcrScanning(true)
    setPaymentError(null)
    try {
      const res = await fetch("/api/admin/ocr-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Image: paymentComprobanteBase64 }),
      })

      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.message || "Error al escanear comprobante")
      }

      if (result.reference) {
        setPaymentReferencia(result.reference)
        alert(`¡Referencia detectada con éxito!: ${result.reference}`)
      } else {
        alert("OCR completado, pero no se pudo detectar el número de referencia automáticamente. Escríbelo de forma manual.")
      }
    } catch (err: any) {
      setPaymentError(`Error en escaneo OCR: ${err.message}`)
    } finally {
      setPaymentOcrScanning(false)
    }
  }

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false)
    setSelectedPaymentLoan(null)
    setPaymentReferencia("")
    setPaymentComprobanteBase64("")
    setSkipComprobante(false)
    setPaymentMoneda("Bs.")
    setPaymentNota("")
    setIsAbono(false)
    setPaymentMontoAbono("")
    setPaymentError(null)
    setPaymentSuccess(null)
  }

  // Submit payment confirmation
  const handleSubmitPaymentVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPaymentLoan) return
    if (!skipComprobante) {
      if (!paymentReferencia.trim()) {
        setPaymentError("El número de referencia de la transacción es obligatorio.")
        return
      }
      if (!paymentComprobanteBase64) {
        setPaymentError("Por favor carga la imagen del comprobante de pago.")
        return
      }
    }
    if (isAbono) {
      if (!paymentMontoAbono || parseFloat(paymentMontoAbono) <= 0) {
        setPaymentError("Por favor ingresa un monto válido para el abono.")
        return
      }
      
      const currentDebt = parseAmountToFloat(selectedPaymentLoan.totalPagar)
      if (parseFloat(paymentMontoAbono) > currentDebt) {
        setPaymentError(`El abono no puede superar la deuda actual (${currentDebt.toLocaleString("es-VE", { minimumFractionDigits: 2 })}).`)
        return
      }
    }

    setPaymentSubmitting(true)
    setPaymentError(null)
    setPaymentSuccess(null)

    try {
      const res = await fetch("/api/admin/update-loan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timestamp: selectedPaymentLoan.timestamp,
          cedula: selectedPaymentLoan.cedula,
          estado: isAbono ? "Aprobado" : "Pagado",
          referencia: skipComprobante ? "Manual - Sin comprobante" : paymentReferencia,
          comprobanteBase64: skipComprobante ? undefined : paymentComprobanteBase64,
          isManual: selectedPaymentLoan.isManual || false,
          rowIndex: selectedPaymentLoan.rowIndex || undefined,
          monedaPago: paymentMoneda,
          notaPago: paymentNota,
          isAbono: isAbono,
          montoAbono: paymentMontoAbono
        }),
      })

      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.message || "Error al confirmar pago")
      }

      setPaymentSuccess(skipComprobante ? "¡Pago confirmado correctamente!" : "¡Pago confirmado y comprobante subido correctamente a Google Drive!")
      mutate()

      setTimeout(() => {
        closePaymentModal()
      }, 1500)
    } catch (err: any) {
      setPaymentError(err.message || "Error al procesar la confirmación del pago")
    } finally {
      setPaymentSubmitting(false)
    }
  }

  const openEditLoanModal = (l: any) => {
    setEditingLoan(l)
    
    // Clean currency symbols from amount/debt before setting them
    const cleanMonto = l.monto ? l.monto.toString().replace(/[^\d.,-]/g, "").replace(/^\.+/, "") : ""
    const cleanTotalPagar = l.totalPagar ? l.totalPagar.toString().replace(/[^\d.,-]/g, "").replace(/^\.+/, "") : ""
    
    // Detect currency symbols independently
    const amtStr = l.monto ? l.monto.toString() : ""
    const hasDollarAmt = amtStr.includes("$")
    const hasEuroAmt = amtStr.includes("€")
    const symbolMonto = hasDollarAmt ? "$" : (hasEuroAmt ? "€" : "Bs.")

    const debtStr = l.totalPagar ? l.totalPagar.toString() : ""
    const hasDollarDebt = debtStr.includes("$")
    const hasEuroDebt = debtStr.includes("€")
    const symbolDeuda = hasDollarDebt ? "$" : (hasEuroDebt ? "€" : "Bs.")

    setEditMonto(cleanMonto)
    setEditTotalPagar(cleanTotalPagar)
    setEditModalidad(l.modalidad || "Pago Total")
    setEditFechas(l.fechas || l.timestamp || "")
    setEditReferencia(l.referencia === "N/A" ? "" : (l.referencia || ""))
    setEditEstado(l.estado || "Aprobado")
    setEditMonedaMonto(symbolMonto)
    setEditMonedaDeuda(symbolDeuda)
    
    setEditError(null)
    setEditSuccess(null)
    setConvAmount("")
    setConvFrom("USD")
    setConvTo("VES")
    setIsEditLoanModalOpen(true)
  }

  const handleEditLoanDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLoan) return
    if (!editMonto || parseFloat(editMonto) <= 0) {
      setEditError("El monto debe ser un número positivo.")
      return
    }
    if (!editTotalPagar || parseFloat(editTotalPagar) <= 0) {
      setEditError("El total a pagar debe ser un número positivo.")
      return
    }
    if (!editFechas.trim()) {
      setEditError("Las fechas de pago no pueden estar vacías.")
      return
    }

    setEditSubmitting(true)
    setEditError(null)
    setEditSuccess(null)

    try {
      const res = await fetch("/api/admin/edit-loan-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isManual: editingLoan.isManual || false,
          rowIndex: editingLoan.rowIndex || undefined,
          timestamp: editingLoan.timestamp,
          cedula: editingLoan.cedula,
          monto: parseFloat(editMonto),
          totalPagar: parseFloat(editTotalPagar),
          modalidad: editModalidad,
          fechas: editFechas,
          referencia: editReferencia,
          estado: editEstado,
          monedaMonto: editMonedaMonto,
          monedaDeuda: editMonedaDeuda
        }),
      })

      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.message || "Error al guardar los cambios")
      }

      setEditSuccess("¡Los detalles del préstamo han sido actualizados exitosamente!")
      mutate()

      setTimeout(() => {
        setIsEditLoanModalOpen(false)
        setEditingLoan(null)
        setConvAmount("")
        setConvFrom("USD")
        setConvTo("VES")
        setEditMonedaMonto("Bs.")
        setEditMonedaDeuda("Bs.")
        setEditSuccess(null)
      }, 1500)
    } catch (err: any) {
      setEditError(err.message || "Ocurrió un error inesperado al editar el préstamo")
    } finally {
      setEditSubmitting(false)
    }
  }

  // Handle user verification save
  const handleSaveUserVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    setSavingUserVerify(true)
    setVerifyError(null)

    try {
      const res = await fetch("/api/admin/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefono: selectedUser.telefono,
          verificado: verificando,
          verificacionMotivo: verificacionMotivo,
        }),
      })

      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.message || "Error al actualizar la verificación")
      }

      // Update local object & mutate state
      setSelectedUser({
        ...selectedUser,
        verificado: verificando,
        verificacionMotivo: verificacionMotivo,
      })
      mutate()
    } catch (err: any) {
      setVerifyError(err.message || "Error al actualizar el usuario")
    } finally {
      setSavingUserVerify(false)
    }
  }

  // Handle generating password reset link
  const handleGeneratePasswordLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetError(null)
    setGeneratedLink("")
    setCopiedResetLink(false)

    if (!resetPhone) return
    setResetLoading(true)

    try {
      const res = await fetch("/api/auth/generate-reset-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono: resetPhone }),
      })

      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.message || "No se pudo generar el enlace")
      }

      setGeneratedLink(result.link)
    } catch (err: any) {
      setResetError(err.message || "Ocurrió un error inesperado")
    } finally {
      setResetLoading(false)
    }
  }

  // Handle creating manual loan
  const handleCreateManualLoan = async (e: React.FormEvent) => {
    e.preventDefault()
    setManualError(null)
    setManualSuccess(null)

    if (!manualClientSelected) {
      setManualError("Por favor selecciona un cliente de la lista.")
      return
    }

    if (!manualMonto || parseFloat(manualMonto) <= 0) {
      setManualError("El monto debe ser un número positivo.")
      return
    }

    if (!manualFechas.trim()) {
      setManualError("Ingresa las fechas correspondientes de cobro.")
      return
    }

    setManualSubmitting(true)

    try {
      const payload = {
        cedula: selectedManualClientObj.cedula,
        nombres: selectedManualClientObj.nombres,
        apellidos: selectedManualClientObj.apellidos,
        telefono: selectedManualClientObj.telefono,
        modalidad: manualModalidad,
        monto: parseFloat(manualMonto),
        montoCuota: computedManualCuota > 0 ? computedManualCuota : null,
        fechas: manualFechas,
        totalPagar: computedManualTotal,
        bcvRate: parseFloat(manualMonto) ? bcvRate : 0,
        estado: manualEstado,
        moneda: manualMoneda,
      }

      const res = await fetch("/api/admin/create-loan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.message || "Error al crear el préstamo")
      }

      setManualSuccess("El préstamo ha sido registrado y aprobado exitosamente.")
      mutate()

      // Reset form fields
      setManualMonto("")
      setManualClientSelected("")
      setManualFechas("")
      setManualCustomTotal("")
      
      // Close modal after 1.5s delay
      setTimeout(() => {
        setIsManualLoanModalOpen(false)
        setManualSuccess(null)
      }, 1500)
    } catch (err: any) {
      setManualError(err.message || "Error al guardar el préstamo manual")
    } finally {
      setManualSubmitting(false)
    }
  }

  // Open User Detail view
  const openUserDetail = (u: any) => {
    setSelectedUser(u)
    setVerificando(u.verificado === "VERIFICADA" ? "VERIFICADA" : "NO_VERIFICADA")
    setVerificacionMotivo(u.verificacionMotivo || "")
    setResetPhone(u.telefono)
    setGeneratedLink("")
    setResetError(null)
  }

  // Access Denied / Loader screens
  if (authorized === null) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground p-6">
        <RefreshCw className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
          Verificando credenciales de administrador...
        </p>
      </div>
    )
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground p-6">
        <div className="border border-destructive/20 bg-destructive/10 max-w-md w-full p-8 rounded-2xl text-center shadow-2xl">
          <ShieldAlert className="h-14 w-14 text-destructive mx-auto mb-4" />
          <h2 className="font-heading text-xl font-bold mb-2">Acceso Denegado</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Esta zona está restringida únicamente para personal autorizado y cuentas administrativas de RESUELVE YA!.
          </p>
          <button
            onClick={() => router.push("/")}
            className="rounded-md bg-primary px-6 py-2.5 text-xs font-semibold tracking-widest text-primary-foreground transition-opacity hover:opacity-90 inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> VOLVER AL INICIO
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Admin Nav */}
      <nav className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-secondary rounded-lg"
              title="Volver a la Página Principal"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-heading text-base sm:text-lg font-bold tracking-tight">
              ADMINISTRACIÓN <span className="text-primary text-xs tracking-widest bg-primary/10 border border-primary/20 px-2 py-0.5 rounded ml-2 uppercase font-extrabold">Control Panel</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-muted-foreground font-bold tracking-wider uppercase">Operador</p>
              <p className="text-xs font-semibold">{user?.nombres || "Isaac Canache"}</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-xs text-primary">
              IC
            </div>
          </div>
        </div>
      </nav>

      {/* Main Admin Area */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border p-5 rounded-2xl relative overflow-hidden group shadow-xl">
            <div className="absolute top-0 right-0 h-24 w-24 bg-primary/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
            <div className="flex items-center justify-between text-muted-foreground mb-3">
              <span className="text-xs font-bold tracking-wider uppercase">Crecimiento (Ganancia)</span>
              <TrendingUp className="h-4.5 w-4.5 text-primary animate-pulse" />
            </div>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Bs. {stats.totalInterestBs.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-emerald-400 font-semibold mt-1">
              ≈ ${stats.totalInterestUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </p>
          </div>

          <div className="bg-card border border-border p-5 rounded-2xl relative overflow-hidden group shadow-xl">
            <div className="absolute top-0 right-0 h-24 w-24 bg-blue-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
            <div className="flex items-center justify-between text-muted-foreground mb-3">
              <span className="text-xs font-bold tracking-wider uppercase">Usuarios Totales</span>
              <Users className="h-4.5 w-4.5 text-blue-400" />
            </div>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {stats.totalUsersCount}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              <span className="text-emerald-400 font-semibold">{stats.verifiedUsersCount} Verificados</span> | {stats.unverifiedUsersCount} Pendientes
            </p>
          </div>

          <div className="bg-card border border-border p-5 rounded-2xl relative overflow-hidden group shadow-xl">
            <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
            <div className="flex items-center justify-between text-muted-foreground mb-3">
              <span className="text-xs font-bold tracking-wider uppercase">Créditos Activos</span>
              <Clock className="h-4.5 w-4.5 text-amber-400" />
            </div>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {stats.approvedCount}
            </p>
            <p className="text-[11px] text-amber-400 font-semibold mt-1">
              Pendientes por cobrar ({stats.pendingCount} por aprobar)
            </p>
          </div>

          <div className="bg-card border border-border p-5 rounded-2xl relative overflow-hidden group shadow-xl">
            <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
            <div className="flex items-center justify-between text-muted-foreground mb-3">
              <span className="text-xs font-bold tracking-wider uppercase">Tasa BCV del Día</span>
              <DollarSign className="h-4.5 w-4.5 text-emerald-400" />
            </div>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Bs. {bcvRate.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Actualizado vía Scraper BCV
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-border mb-6">
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold tracking-wider uppercase transition-colors relative ${
              activeTab === "stats" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Estadísticas y Crecimiento
            {activeTab === "stats" && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-primary" />}
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold tracking-wider uppercase transition-colors relative ${
              activeTab === "users" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monitor de Usuarios
            {activeTab === "users" && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-primary" />}
          </button>
          <button
            onClick={() => setActiveTab("loans")}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold tracking-wider uppercase transition-colors relative ${
              activeTab === "loans" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Control de Préstamos
            {activeTab === "loans" && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-primary" />}
          </button>
          <button
            onClick={() => setActiveTab("manual")}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold tracking-wider uppercase transition-colors relative ${
              activeTab === "manual" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Carga Manual (WhatsApp)
            {activeTab === "manual" && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-primary" />}
          </button>
        </div>

        {/* Loading overlay when re-validating */}
        {isValidating && (
          <div className="text-right text-[10px] text-primary/80 font-semibold mb-2 animate-pulse flex items-center justify-end gap-1.5">
            <RefreshCw className="h-3 w-3 animate-spin" /> SINCRONIZANDO CON GOOGLE SHEETS...
          </div>
        )}

        {/* Tab 1: Stats & Growth */}
        {activeTab === "stats" && (
          <div className="space-y-6 animate-fadeIn text-xs">
            {/* Capital Base Editor & Working Capital Summary Card */}
            <div className="bg-card border border-border p-6 rounded-2xl shadow-xl grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="space-y-2">
                <h3 className="text-muted-foreground font-bold tracking-wider uppercase text-[10px]">Capital Base de Trabajo</h3>
                {isEditingCapital ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold font-mono text-primary">$</span>
                    <input
                      type="number"
                      value={tempCapital}
                      onChange={(e) => setTempCapital(e.target.value)}
                      className="bg-zinc-950 border border-border rounded-lg px-2.5 py-1 text-sm focus:border-primary focus:outline-none font-mono w-28"
                      placeholder="1000"
                    />
                    <button
                      onClick={() => handleUpdateCapitalBase(tempCapital)}
                      className="bg-primary text-primary-foreground px-3 py-1 rounded text-[11px] font-semibold hover:opacity-90"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => {
                        setTempCapital(capitalBase.toString())
                        setIsEditingCapital(false)
                      }}
                      className="border border-border hover:bg-secondary px-3 py-1 rounded text-[11px]"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold font-mono text-foreground">
                      ${capitalBase.toLocaleString("en-US", { minimumFractionDigits: 2 })} <span className="text-xs text-muted-foreground font-normal">USD</span>
                    </p>
                    <button
                      onClick={() => {
                        setTempCapital(capitalBase.toString())
                        setIsEditingCapital(true)
                      }}
                      className="text-xs text-primary hover:underline font-semibold"
                    >
                      (Editar)
                    </button>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  El capital base inicial. Por defecto, se calcula sumando todos los préstamos del 23 al 31 de Mayo.
                </p>
              </div>

              <div className="space-y-2 border-t md:border-t-0 md:border-l md:border-r border-border/80 md:px-6 py-4 md:py-0">
                <h3 className="text-muted-foreground font-bold tracking-wider uppercase text-[10px]">Crecimiento Total</h3>
                <p className="text-2xl font-bold text-emerald-400 font-mono">
                  +{capitalBase > 0 ? ((stats.totalInterestUsd / capitalBase) * 100).toFixed(2) : "0.00"}%
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Proporción de interés acumulado sobre el capital inicial.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-muted-foreground font-bold tracking-wider uppercase text-[10px]">Capital de Trabajo Actual</h3>
                <p className="text-2xl font-bold text-primary font-mono">
                  ${(capitalBase + stats.totalInterestUsd).toLocaleString("en-US", { minimumFractionDigits: 2 })} <span className="text-xs text-muted-foreground font-normal">USD</span>
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Capital actual acumulado (Capital Base + Ganancias por Intereses).
                </p>
              </div>
            </div>

            {/* Charts section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Distribution Table */}
              <div className="bg-card border border-border p-6 rounded-2xl shadow-xl lg:col-span-2 space-y-4">
                <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Clasificación y Contabilidad de Préstamos
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-950/80 border-b border-border text-muted-foreground font-semibold">
                        <th className="px-4 py-2.5">Origen / Canal</th>
                        <th className="px-4 py-2.5 text-right">Solicitado</th>
                        <th className="px-4 py-2.5 text-right">Aprobado / Activo</th>
                        <th className="px-4 py-2.5 text-right">Recuperado (Pagado)</th>
                        <th className="px-4 py-2.5 text-right text-primary font-bold">Interés Generado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      <tr>
                        <td className="px-4 py-3 font-semibold text-foreground">💻 Canal Web (Página)</td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">${stats.webRequestedUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">${stats.webApprovedUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">${stats.webPaidUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-400 font-bold">${stats.webInterestUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-semibold text-foreground">🟢 Canal WhatsApp / Manual</td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">${stats.manualRequestedUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">${stats.manualApprovedUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">${stats.manualPaidUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-400 font-bold">${stats.manualInterestUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                      <tr className="bg-zinc-950/40 border-t border-border font-bold">
                        <td className="px-4 py-3 text-foreground font-bold">💼 Total General (Plataforma)</td>
                        <td className="px-4 py-3 text-right font-mono text-foreground">${stats.totalRequestedUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-3 text-right font-mono text-foreground">${stats.totalApprovedUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-3 text-right font-mono text-foreground">${stats.totalPaidUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-3 text-right font-mono text-primary font-bold">${stats.totalInterestUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="text-[10px] text-muted-foreground flex gap-4 mt-2">
                  <span>* Todos los valores se muestran expresados en **USD** a tasa BCV.</span>
                  <span>* Total General incluye préstamos activos + cobrados de ambos canales.</span>
                </div>
              </div>

              {/* Monthly growth bar chart */}
              <div className="bg-card border border-border p-6 rounded-2xl shadow-xl space-y-4">
                <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Crecimiento Mensual (USD)
                </h3>
                {stats.monthlyEarnings.length === 0 ? (
                  <div className="h-44 border border-dashed border-border rounded-xl flex items-center justify-center text-muted-foreground text-xs">
                    Sin intereses generados este mes
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Visual Monthly bars chart */}
                    <div className="h-32 flex items-end justify-between px-2 pt-4">
                      {stats.monthlyEarnings.map((val, idx) => {
                        const maxVal = Math.max(...stats.monthlyEarnings.map(m => m.earningsUsd), 1)
                        const barHeight = (val.earningsUsd / maxVal) * 100
                        return (
                          <div key={idx} className="flex flex-col items-center group relative w-full">
                            {/* Hover tooltip */}
                            <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-950 text-foreground border border-border px-2 py-0.5 rounded text-[9px] font-mono whitespace-nowrap pointer-events-none z-10">
                              ${val.earningsUsd.toFixed(2)}
                            </div>
                            {/* Visual Bar */}
                            <div
                              className="w-5 bg-gradient-to-t from-primary to-orange-400 rounded-t transition-all duration-500 hover:from-primary/90 hover:to-orange-300 cursor-pointer"
                              style={{ height: `${Math.max(5, barHeight)}%` }}
                            />
                            {/* Label */}
                            <span className="text-[9px] text-muted-foreground uppercase font-semibold mt-2.5">{val.month}</span>
                          </div>
                        )
                      })}
                    </div>
                    <div className="text-[9px] text-muted-foreground text-center border-t border-border/60 pt-2 uppercase font-bold tracking-wider">
                      Progresión Cronológica de Ganancias por Mes
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Ribbon */}
            <div className="bg-card border border-border p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-semibold text-sm">¿Deseas registrar un nuevo préstamo manualmente?</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Permite añadir un préstamo pre-aprobado asignado a cualquier usuario registrado de la plataforma.
                </p>
              </div>
              <button
                onClick={() => setIsManualLoanModalOpen(true)}
                className="w-full sm:w-auto rounded-md bg-primary px-5 py-2.5 text-xs font-semibold tracking-widest text-primary-foreground hover:bg-primary/95 transition-colors uppercase shrink-0 flex items-center justify-center gap-2"
              >
                <PlusCircle className="h-4.5 w-4.5" /> Registrar Préstamo Manual
              </button>
            </div>

            {/* SECTION: Seguimiento de Tasa de Cambio y Proyecciones */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Proyecciones y Estadísticas de Tasa */}
              <div className="bg-card border border-border p-6 rounded-2xl shadow-xl space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-primary border-b border-border/60 pb-3 mb-4">
                    <TrendingUp className="h-5 w-5" />
                    <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-foreground">
                      Análisis y Proyección de Tasa
                    </h3>
                  </div>

                  {loadingBcvHistory ? (
                    <div className="flex flex-col items-center justify-center h-44 space-y-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground">Analizando historial del dólar...</span>
                    </div>
                  ) : bcvAnalysis ? (
                    <div className="space-y-4 text-xs">
                      <div className="bg-zinc-950/40 p-3 rounded-lg border border-border/80 flex items-center justify-between">
                        <div>
                          <p className="text-muted-foreground font-semibold uppercase text-[9px] tracking-wider">Tasa BCV Actual</p>
                          <p className="text-xl font-bold font-mono text-foreground mt-0.5">
                            Bs. {bcvAnalysis.currentRate.toFixed(4)}
                          </p>
                        </div>
                        <span className="bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                          USD / VES
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-zinc-950/40 p-3 rounded-lg border border-border/80">
                          <p className="text-muted-foreground font-semibold uppercase text-[9px] tracking-wider">Crecimiento Diario</p>
                          <p className="text-sm font-bold font-mono text-red-400 mt-1">
                            +{bcvAnalysis.avgDailyIncreaseBs.toFixed(4)} Bs.
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            ({bcvAnalysis.avgDailyIncreasePct.toFixed(2)}%)
                          </p>
                        </div>

                        <div className="bg-zinc-950/40 p-3 rounded-lg border border-border/80">
                          <p className="text-muted-foreground font-semibold uppercase text-[9px] tracking-wider">Tasa Proyectada (15d)</p>
                          <p className="text-sm font-bold font-mono text-primary mt-1">
                            Bs. {bcvAnalysis.projectedRate15Days.toFixed(4)}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            (+{bcvAnalysis.projectedChangePct15Days.toFixed(2)}%)
                          </p>
                        </div>
                      </div>

                      <div className="bg-primary/5 border border-primary/15 p-3 rounded-lg text-[10px] leading-relaxed text-muted-foreground">
                        💡 **Nota del Analizador:** Basado en la progresión diaria calculada, se estima que el dólar incremente aproximadamente **{bcvAnalysis.avgDailyIncreasePct.toFixed(2)}%** cada día en bolívares, acumulando un alza estimada del **{bcvAnalysis.projectedChangePct15Days.toFixed(2)}%** quincenal.
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-xs text-muted-foreground py-10">
                      No hay datos de análisis disponibles.
                    </div>
                  )}
                </div>

                <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider pt-3 border-t border-border/60">
                  Estadísticas predictivas en base a BCV
                </div>
              </div>

              {/* Tabla Histórica de Tasas */}
              <div className="bg-card border border-border p-6 rounded-2xl shadow-xl lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-2">
                  <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Historial de Cotizaciones Recientes (BCV)
                  </h3>
                  <span className="text-[10px] text-muted-foreground">Últimas actualizaciones</span>
                </div>

                {loadingBcvHistory ? (
                  <div className="flex items-center justify-center h-48">
                    <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : bcvHistory.length === 0 ? (
                  <div className="text-center text-muted-foreground text-xs py-12">
                    Sin registros de tasa de cambio todavía.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-zinc-950/80 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider">
                          <th className="px-4 py-2.5">Fecha</th>
                          <th className="px-4 py-2.5 text-right">Tasa de Cambio</th>
                          <th className="px-4 py-2.5 text-right">Cambio (Bs.)</th>
                          <th className="px-4 py-2.5 text-right">Cambio (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50 font-mono text-[11px]">
                        {bcvHistory.slice(0, 7).map((row, idx) => {
                          const isPositive = parseFloat(row.variacionBs) > 0
                          const isZero = parseFloat(row.variacionBs) === 0
                          return (
                            <tr key={idx} className="hover:bg-zinc-950/20 transition-colors">
                              <td className="px-4 py-2.5 text-muted-foreground font-semibold">{row.fecha}</td>
                              <td className="px-4 py-2.5 text-right font-bold text-foreground">Bs. {parseFloat(row.tasa).toFixed(4)}</td>
                              <td className={`px-4 py-2.5 text-right font-semibold ${isZero ? "text-muted-foreground" : isPositive ? "text-red-400" : "text-emerald-400"}`}>
                                {isZero ? "-" : `${isPositive ? "+" : ""}${row.variacionBs}`}
                              </td>
                              <td className={`px-4 py-2.5 text-right font-semibold ${isZero ? "text-muted-foreground" : isPositive ? "text-red-400" : "text-emerald-400"}`}>
                                {isZero ? "0.00%" : `${isPositive ? "+" : ""}${row.variacionPct}`}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION: Configuración de Tasas de Interés y Recomendaciones AI */}
            <div className="bg-card border border-border p-6 rounded-2xl shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/60 pb-4 gap-2">
                <div className="flex items-center gap-2 text-primary">
                  <DollarSign className="h-5.5 w-5.5" />
                  <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-foreground">
                    Configuración de Tasas de Interés (Niveles de Fidelidad)
                  </h3>
                </div>
                <span className="text-[10px] text-muted-foreground bg-secondary px-2.5 py-1 border border-border rounded font-bold">
                  Cambios automáticos en paneles de usuario
                </span>
              </div>

              {/* Caja de Recomendaciones AI */}
              {bcvAnalysis && (
                <div className="bg-zinc-950/60 border border-border p-4.5 rounded-xl space-y-3.5 text-xs">
                  <div className="flex items-center gap-2 text-primary font-bold text-[11px] uppercase tracking-wider">
                    <TrendingUp className="h-4.5 w-4.5 text-amber-400" />
                    <span>Recomendación del Algoritmo de Inflación (BCV)</span>
                  </div>

                  <p className="text-muted-foreground leading-relaxed text-[11px]">
                    Basado en la tasa BCV promedio de variación diaria de **+{bcvAnalysis.avgDailyIncreasePct.toFixed(2)}%** y una proyección quincenal de **+{bcvAnalysis.projectedChangePct15Days.toFixed(2)}%**, el algoritmo recomienda ajustar la tasa de interés base para mantener la rentabilidad contra la devaluación:
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-3 bg-secondary/30 p-3 rounded-lg border border-border/50">
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-muted-foreground text-[9px] uppercase font-semibold">Tasa Base Sugerida</p>
                        <p className="text-base font-extrabold text-amber-400 font-mono mt-0.5">
                          {bcvAnalysis.avgDailyIncreasePct < 0.1 ? "48%" : bcvAnalysis.avgDailyIncreasePct < 0.3 ? "54%" : bcvAnalysis.avgDailyIncreasePct < 0.5 ? "60%" : "65%"} de interés
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[9px] uppercase font-semibold">Diferencial por Nivel</p>
                        <p className="text-base font-extrabold text-foreground font-mono mt-0.5">
                          -{bcvAnalysis.avgDailyIncreasePct < 0.1 ? "1.5%" : bcvAnalysis.avgDailyIncreasePct < 0.3 ? "2.0%" : bcvAnalysis.avgDailyIncreasePct < 0.5 ? "2.0%" : "2.5%"} cada nivel
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const dailyPct = bcvAnalysis.avgDailyIncreasePct
                        let base = 54
                        let step = 2
                        if (dailyPct < 0.1) {
                          base = 48
                          step = 1.5
                        } else if (dailyPct < 0.3) {
                          base = 54
                          step = 2
                        } else if (dailyPct < 0.5) {
                          base = 60
                          step = 2
                        } else {
                          base = 65
                          step = 2.5
                        }

                        setInterestConfig({
                          Tasa_Interes_Base: base,
                          Interes_Nivel_1: base,
                          Interes_Nivel_2: base - step,
                          Interes_Nivel_3: base - step * 2,
                          Interes_Nivel_4: base - step * 3,
                          Interes_Nivel_5: base - step * 4,
                          Interes_Nivel_6: base - step * 5,
                          Interes_Nivel_7: base - step * 6,
                          Interes_Nivel_8: base - step * 7,
                          Interes_Nivel_9: base - step * 8,
                        })
                        setConfigSuccess("Sugerencia AI aplicada a los campos de texto inferiores. Haz clic en 'Guardar Cambios' para guardarlos en Sheets.")
                        setTimeout(() => setConfigSuccess(null), 5000)
                      }}
                      className="rounded-md bg-primary/95 text-primary-foreground hover:bg-primary font-bold px-4 py-2 text-[10px] uppercase transition-all tracking-wider flex items-center gap-1 shrink-0"
                    >
                      Aplicar Sugerencia AI
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveInterestConfig} className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {/* Tasa Base */}
                  <div className="bg-zinc-950/40 p-3.5 border border-border rounded-xl space-y-1.5 col-span-2 sm:col-span-1">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Tasa Base (%):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="100"
                      value={interestConfig.Tasa_Interes_Base}
                      onChange={(e) => setInterestConfig({ ...interestConfig, Tasa_Interes_Base: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-zinc-950 border border-border rounded-lg px-3 py-1.5 text-xs font-mono font-bold focus:border-primary focus:outline-none"
                      required
                    />
                  </div>

                  {/* Niveles 1 al 9 */}
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => {
                    const fieldName = `Interes_Nivel_${lvl}`
                    const animalNames: Record<number, string> = {
                      1: "Caracol",
                      2: "Iguana",
                      3: "Guacamaya",
                      4: "Delfín",
                      5: "Chigüire",
                      6: "Venado",
                      7: "Águila",
                      8: "Caimán",
                      9: "Jaguar",
                    }
                    return (
                      <div key={lvl} className="bg-zinc-950/40 p-3 border border-border/80 rounded-xl space-y-1">
                        <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-wider">Nivel {lvl}: {animalNames[lvl]}</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={interestConfig[fieldName] ?? 0}
                            onChange={(e) => setInterestConfig({ ...interestConfig, [fieldName]: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-zinc-950 border border-border/60 rounded px-2.5 py-1 text-xs font-mono font-bold focus:border-primary focus:outline-none"
                            required
                          />
                          <span className="text-muted-foreground text-xs">%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {configError && <p className="text-xs text-destructive font-semibold">✗ {configError}</p>}
                {configSuccess && <p className="text-xs text-emerald-400 font-semibold">✓ {configSuccess}</p>}

                <div className="flex justify-end pt-2 border-t border-border/60">
                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="w-full sm:w-auto rounded-md bg-primary hover:opacity-95 disabled:opacity-50 text-primary-foreground font-bold px-6 py-2.5 text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                  >
                    {savingConfig ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Guardando Cambios...
                      </>
                    ) : (
                      <>Guardar Cambios de Intereses</>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* SECTION: Ciclos de Inversión Quincenales y Crecimiento Acumulado */}
            <div className="bg-card border border-border p-6 rounded-2xl shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/60 pb-4 gap-2">
                <div className="flex items-center gap-2 text-primary">
                  <TrendingUp className="h-5.5 w-5.5 text-emerald-400" />
                  <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-foreground">
                    Ciclos de Inversión Quincenales y Crecimiento de Capital
                  </h3>
                </div>
                <span className="text-[10px] text-muted-foreground bg-secondary px-2.5 py-1 border border-border rounded font-bold uppercase">
                  Progresión Compuesta (Base + Intereses Cobrados)
                </span>
              </div>

              {investmentCycles.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  Sin registros de préstamos cobrados (pagados) para calcular los ciclos de inversión.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* KPI Summary boxes of compound progression */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-zinc-950/40 p-4 border border-border rounded-xl">
                      <p className="text-muted-foreground font-semibold uppercase text-[9px] tracking-wider">Ciclos Evaluados</p>
                      <p className="text-lg font-bold font-mono text-foreground mt-0.5">{investmentCycles.length} quincenas</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Desde el primer préstamo cobrado</p>
                    </div>
                    <div className="bg-zinc-950/40 p-4 border border-border rounded-xl">
                      <p className="text-muted-foreground font-semibold uppercase text-[9px] tracking-wider">Capital de Trabajo Actual</p>
                      <p className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                        ${investmentCycles[0].endCapital.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">Base inicial: ${capitalBase.toFixed(2)} USD</p>
                    </div>
                    <div className="bg-zinc-950/40 p-4 border border-border rounded-xl">
                      <p className="text-muted-foreground font-semibold uppercase text-[9px] tracking-wider">Crecimiento Compuesto Total</p>
                      <p className="text-lg font-bold font-mono text-primary mt-0.5">
                        +{((investmentCycles[0].endCapital - capitalBase) / capitalBase * 100).toFixed(2)}%
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        +${(investmentCycles[0].endCapital - capitalBase).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD de ganancia acumulada
                      </p>
                    </div>
                  </div>

                  {/* Cycles Ledger Table */}
                  <div className="overflow-x-auto border border-border/80 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-zinc-950 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider">
                          <th className="px-4 py-3">Ciclo / Quincena</th>
                          <th className="px-4 py-3">Rango de Fechas</th>
                          <th className="px-4 py-3 text-right">Capital Inicial (USD)</th>
                          <th className="px-4 py-3 text-right">Ganancia Cobrada (USD)</th>
                          <th className="px-4 py-3 text-right">Capital Final (USD)</th>
                          <th className="px-4 py-3 text-center">Crecimiento</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 font-mono text-[11px]">
                        {investmentCycles.map((cycle, idx) => (
                          <tr key={idx} className="hover:bg-zinc-950/20 transition-colors">
                            <td className="px-4 py-3 font-bold text-foreground">{cycle.name}</td>
                            <td className="px-4 py-3 text-muted-foreground text-[10px]">
                              {cycle.startDate.toLocaleDateString("es-VE")} al {cycle.endDate.toLocaleDateString("es-VE")}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold">
                              ${cycle.startCapital.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-400">
                              +${cycle.earnings.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-primary">
                              ${cycle.endCapital.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                cycle.earnings > 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-950/80 text-muted-foreground border border-border"
                              }`}>
                                +{cycle.growthPct.toFixed(2)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: User Monitoring */}
        {(activeTab === "users") && (
          <div className="space-y-4 animate-fadeIn">
            {/* Filters bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card border border-border p-4 rounded-xl shadow-lg">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar usuario por nombre, cédula o teléfono..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-zinc-950 border border-border rounded-lg pl-10 pr-4 py-2 text-xs focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
                <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="w-full sm:w-auto bg-zinc-950 border border-border rounded-lg px-3.5 py-2 text-xs focus:border-primary focus:outline-none"
                >
                  <option value="all">Verificación: Todos</option>
                  <option value="verified">Solo Verificados</option>
                  <option value="unverified">Solo Pendientes / No Verificados</option>
                  <option value="whatsapp">Clientes WhatsApp</option>
                </select>
                <button
                  onClick={() => setIsWhatsAppModalOpen(true)}
                  className="w-full sm:w-auto rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-95 transition-all flex items-center justify-center gap-1.5 shadow"
                >
                  <PlusCircle className="h-4 w-4" /> Registrar WhatsApp
                </button>
              </div>
            </div>

            {/* Users table */}
            <div className="bg-card border border-border rounded-xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-950/80 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider">
                      <th className="px-5 py-3.5">Cliente</th>
                      <th className="px-5 py-3.5">Cédula</th>
                      <th className="px-5 py-3.5">Teléfono</th>
                      <th className="px-5 py-3.5">Ubicación</th>
                      <th className="px-5 py-3.5">Estatus</th>
                      <th className="px-5 py-3.5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                          No se encontraron usuarios que coincidan con la búsqueda.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u: any, idx: number) => (
                        <tr key={idx} className="hover:bg-zinc-950/20 transition-colors">
                          <td className="px-5 py-4 font-semibold text-foreground">
                            {u.nombres} {u.apellidos}
                          </td>
                          <td className="px-5 py-4 text-muted-foreground font-mono">{u.cedula}</td>
                          <td className="px-5 py-4 text-muted-foreground font-mono">{u.telefono}</td>
                          <td className="px-5 py-4 text-muted-foreground truncate max-w-[150px]">
                            {u.ciudad}, {u.municipio}
                          </td>
                          <td className="px-5 py-4">
                            {u.verificado === "VERIFICADA" ? (
                              <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1.5 w-fit">
                                <ShieldCheck className="h-3.5 w-3.5" /> VERIFICADA
                              </span>
                            ) : u.verificado === "WHATSAPP" ? (
                              <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1.5 w-fit">
                                <ShieldCheck className="h-3.5 w-3.5" /> CLIENTE WHATSAPP
                              </span>
                            ) : (
                              <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1.5 w-fit">
                                <ShieldAlert className="h-3.5 w-3.5" /> SIN VALIDAR
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => openUserDetail(u)}
                              className="rounded-md bg-secondary border border-border text-foreground hover:bg-muted px-3.5 py-1.5 text-[11px] font-semibold transition-colors flex items-center gap-1 ml-auto"
                            >
                              Ver Ficha <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Loan Control */}
        {activeTab === "loans" && (
          <div className="space-y-4 animate-fadeIn">
            {/* Filters bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card border border-border p-4 rounded-xl shadow-lg">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar préstamo por cliente, cédula o teléfono..."
                  value={loanSearch}
                  onChange={(e) => setLoanSearch(e.target.value)}
                  className="w-full bg-zinc-950 border border-border rounded-lg pl-10 pr-4 py-2 text-xs focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
                <select
                  value={loanFilter}
                  onChange={(e) => setLoanFilter(e.target.value)}
                  className="w-full sm:w-auto bg-zinc-950 border border-border rounded-lg px-3.5 py-2 text-xs focus:border-primary focus:outline-none"
                >
                  <option value="all">Estatus: Todos</option>
                  <option value="pendiente">Pendientes por Aprobar</option>
                  <option value="aprobado">Pendientes por Pagar (Activos)</option>
                  <option value="pagado">Pagados</option>
                  <option value="rechazado">Rechazados</option>
                </select>

                <button
                  onClick={() => setIsManualLoanModalOpen(true)}
                  className="w-full sm:w-auto rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-95 transition-all flex items-center justify-center gap-1.5 shadow"
                >
                  <PlusCircle className="h-4 w-4" /> Registrar Manual
                </button>
              </div>
            </div>

            {/* Loans table */}
            <div className="bg-card border border-border rounded-xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-950/80 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider">
                      <th className="px-5 py-3.5">Fecha / Hora</th>
                      <th className="px-5 py-3.5">Cliente</th>
                      <th className="px-5 py-3.5 font-mono">Cédula</th>
                      <th className="px-5 py-3.5">Modalidad</th>
                      <th className="px-5 py-3.5">Monto (Bs.)</th>
                      <th className="px-5 py-3.5">Total a Pagar</th>
                      <th className="px-5 py-3.5">Estado</th>
                      <th className="px-5 py-3.5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredLoans.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">
                          No se encontraron préstamos que coincidan con los criterios.
                        </td>
                      </tr>
                    ) : (
                      filteredLoans.map((l: any, idx: number) => {
                        const isUpdating = updatingLoanId === `${l.timestamp}-${l.cedula}`
                        const est = l.estado.trim().toLowerCase()

                        return (
                          <tr key={idx} className="hover:bg-zinc-950/20 transition-colors">
                            <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">{l.timestamp}</td>
                            <td className="px-5 py-4">
                              <p className="font-semibold text-foreground">{l.nombres} {l.apellidos}</p>
                              <p className="text-[10px] text-muted-foreground">{l.telefono}</p>
                            </td>
                            <td className="px-5 py-4 text-muted-foreground font-mono">{l.cedula}</td>
                            <td className="px-5 py-4 text-muted-foreground font-medium">{l.modalidad}</td>
                            <td className="px-5 py-4 text-foreground font-semibold font-mono">{l.monto}</td>
                            <td className="px-5 py-4 text-primary font-semibold font-mono">
                              <p>{l.totalPagar}</p>
                              {l.referencia && (
                                <p className="text-[10px] text-muted-foreground font-normal mt-0.5">
                                  Ref: <span className="font-mono text-[11px] select-all text-foreground/80 font-bold bg-secondary/80 px-1 rounded">{l.referencia}</span>
                                </p>
                              )}
                              {l.comprobanteLink && (
                                <a
                                  href={l.comprobanteLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-primary hover:underline flex items-center gap-0.5 mt-1 font-semibold"
                                >
                                  Comprobante ↗
                                </a>
                              )}
                              {/* Historial de Abonos / Pagos Parciales */}
                              {l.notaPago && l.notaPago.trim() !== "" && (
                                <div className="mt-2 space-y-1 font-sans">
                                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Abonos:</p>
                                  {l.notaPago.split("|").map((item: string, idx: number) => {
                                    const clean = item.trim()
                                    if (!clean) return null
                                    return (
                                      <p key={idx} className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded w-fit font-semibold leading-normal">
                                        ✓ {clean}
                                      </p>
                                    )
                                  })}
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              {est === "pendiente" && (
                                <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 w-fit uppercase">
                                  <Clock className="h-3 w-3" /> PENDIENTE
                                </span>
                              )}
                              {(est === "aprobado" || est === "activo" || est === "por pagar" || est === "pendiente por pagar" || est === "pendiente_por_pagar") && (
                                <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 w-fit uppercase">
                                  <Clock className="h-3 w-3" /> POR PAGAR
                                </span>
                              )}
                              {est === "pagado" && (
                                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 w-fit uppercase">
                                  <CheckCircle2 className="h-3 w-3" /> PAGADO
                                </span>
                              )}
                              {est === "rechazado" && (
                                <span className="bg-zinc-500/10 border border-zinc-500/20 text-zinc-400 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 w-fit uppercase">
                                  <XCircle className="h-3 w-3" /> RECHAZADO
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-center">
                              {isUpdating ? (
                                <RefreshCw className="h-4 w-4 animate-spin text-primary mx-auto" />
                              ) : (
                                <div className="flex items-center justify-center gap-2">
                                  {est === "pendiente" && (
                                    <>
                                      <button
                                        onClick={() => handleUpdateLoanStatus(l, "Aprobado")}
                                        className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white px-2.5 py-1 rounded text-[10px] font-semibold transition-all"
                                      >
                                        APROBAR
                                      </button>
                                      <button
                                        onClick={() => handleUpdateLoanStatus(l, "Rechazado")}
                                        className="bg-zinc-500/15 border border-zinc-500/30 text-zinc-400 hover:bg-zinc-500 hover:text-white px-2.5 py-1 rounded text-[10px] font-semibold transition-all"
                                      >
                                        RECHAZAR
                                      </button>
                                    </>
                                  )}

                                  {(est === "aprobado" || est === "activo" || est === "por pagar" || est === "pendiente por pagar" || est === "pendiente_por_pagar") && (
                                    <>
                                      <button
                                        onClick={() => openPaymentVerificationModal(l)}
                                        className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white px-2.5 py-1 rounded text-[10px] font-semibold transition-all"
                                      >
                                        COBRADO (PAGADO)
                                      </button>
                                      <button
                                        onClick={() => handleUpdateLoanStatus(l, "Rechazado")}
                                        className="bg-zinc-500/15 border border-zinc-500/30 text-zinc-400 hover:bg-zinc-500 hover:text-white px-2.5 py-1 rounded text-[10px] font-semibold transition-all"
                                      >
                                        RECHAZAR
                                      </button>
                                    </>
                                  )}

                                  {(est === "pagado" || est === "rechazado") && (
                                    <button
                                      onClick={() => handleUpdateLoanStatus(l, "Pendiente")}
                                      className="border border-border hover:bg-secondary px-2.5 py-1 rounded text-[10px] font-semibold transition-all"
                                    >
                                      REVERTIR A PENDIENTE
                                    </button>
                                  )}

                                  <button
                                    onClick={() => openEditLoanModal(l)}
                                    disabled={isUpdating}
                                    className="bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white px-2 py-1 rounded text-[10px] font-semibold transition-all uppercase disabled:opacity-50"
                                    title="Editar detalles del préstamo"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => handleDeleteLoan(l)}
                                    disabled={isUpdating}
                                    className="bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white px-2 py-1 rounded text-[10px] font-semibold transition-all uppercase disabled:opacity-50"
                                    title="Eliminar este préstamo permanentemente"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Carga Manual (WhatsApp) */}
        {activeTab === "manual" && (
          <div className="space-y-4 animate-fadeIn">
            {/* Filters bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card border border-border p-4 rounded-xl shadow-lg">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar solicitante manual..."
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  className="w-full bg-zinc-950 border border-border rounded-lg pl-10 pr-4 py-2 text-xs focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                <select
                  value={manualFilter}
                  onChange={(e) => setManualFilter(e.target.value)}
                  className="w-full sm:w-auto bg-zinc-950 border border-border rounded-lg px-3.5 py-2 text-xs focus:border-primary focus:outline-none"
                >
                  <option value="all">Filtro: Todos</option>
                  <option value="registered">Solo Registrados (Clientes)</option>
                  <option value="unregistered">Solo No Registrados (Pendientes WhatsApp)</option>
                </select>
              </div>
            </div>

            {/* Manual Applicants table */}
            <div className="bg-card border border-border rounded-xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-950/80 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider">
                      <th className="px-5 py-3.5">Solicitante (Hoja Carga Manual)</th>
                      <th className="px-5 py-3.5 text-center">Nro Préstamos</th>
                      <th className="px-5 py-3.5 text-right">Total Solicitado</th>
                      <th className="px-5 py-3.5 text-right">Total Deuda</th>
                      <th className="px-5 py-3.5">Estatus Base Datos</th>
                      <th className="px-5 py-3.5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredManualApplicants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                          No se encontraron solicitantes en la hoja de carga manual.
                        </td>
                      </tr>
                    ) : (
                      filteredManualApplicants.map((ma: any, idx: number) => (
                        <tr key={idx} className="hover:bg-zinc-950/20 transition-colors">
                          <td className="px-5 py-4">
                            <span className="font-bold text-foreground text-sm font-mono block">{ma.nombreOriginal}</span>
                            <span className="text-[10px] text-muted-foreground mt-0.5 block">
                              Encontrado en fila(s): {ma.loansList.map((l: any) => `#${l.rowIndex}`).join(", ")}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center font-bold text-foreground font-mono">
                            {ma.loansCount}
                          </td>
                          <td className="px-5 py-4 text-right font-semibold text-foreground font-mono">
                            Bs. {ma.totalMonto.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-4 text-right font-semibold text-primary font-mono">
                            Bs. {ma.totalDeuda.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-4">
                            {ma.isRegistered ? (
                              <div className="space-y-1">
                                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1.5 w-fit">
                                  <ShieldCheck className="h-3.5 w-3.5" /> REGISTRADO EN SISTEMA
                                </span>
                                <span className="text-[10px] text-muted-foreground block truncate max-w-[200px]">
                                  {ma.matchedUser.nombres} {ma.matchedUser.apellidos} ({ma.matchedUser.telefono})
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1.5 w-fit">
                                  <ShieldAlert className="h-3.5 w-3.5 animate-pulse" /> NO REGISTRADO (WHATSAPP)
                                </span>
                                <span className="text-[10px] text-muted-foreground block">
                                  Requiere registrar como cliente para contabilidad
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            {ma.isRegistered ? (
                              <button
                                onClick={() => openUserDetail(ma.matchedUser)}
                                className="rounded-md bg-secondary border border-border text-foreground hover:bg-muted px-3 py-1.5 text-[10px] font-semibold transition-colors flex items-center gap-1 ml-auto uppercase"
                              >
                                Ver Ficha
                              </button>
                            ) : (
                              <button
                                onClick={() => openManualRegisterForWhatsApp(ma)}
                                className="rounded-md bg-primary text-primary-foreground hover:opacity-90 px-3 py-1.5 text-[10px] font-bold transition-all flex items-center gap-1 ml-auto uppercase shadow"
                              >
                                <PlusCircle className="h-3.5 w-3.5" /> Cargar Datos
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: User Detail Expander Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border w-full max-w-2xl p-6 rounded-2xl relative shadow-2xl space-y-6 my-8">
            <button
              onClick={() => {
                setSelectedUser(null)
                setGeneratedLink("")
                setResetError(null)
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-secondary rounded-lg"
            >
              <XCircle className="h-5 w-5" />
            </button>

            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h3 className="font-heading text-lg font-bold text-foreground">
                  Ficha de Cliente: {selectedUser.nombres} {selectedUser.apellidos}
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Registrado el: {selectedUser.fechaRegistro ? new Date(selectedUser.fechaRegistro).toLocaleString("es-VE") : "N/A"}
                </p>
              </div>

              {(() => {
                const levelInfo = getUserLevelInfo(selectedUser);
                const animalNames: Record<number, string> = {
                  1: "Caracol 🐌",
                  2: "Iguana 🦎",
                  3: "Guacamaya 🦜",
                  4: "Delfín 🐬",
                  5: "Chigüire 🦫",
                  6: "Venado 🦌",
                  7: "Águila 🦅",
                  8: "Caimán 🐊",
                  9: "Jaguar 🐆",
                };
                return (
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {selectedUser.verificado === "VERIFICADA" ? (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 w-fit uppercase">
                        <ShieldCheck className="h-4 w-4" /> Cliente Verificado
                      </div>
                    ) : selectedUser.verificado === "WHATSAPP" ? (
                      <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 w-fit uppercase">
                        <ShieldCheck className="h-4 w-4" /> Cliente WhatsApp
                      </div>
                    ) : (
                      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 w-fit uppercase">
                        <ShieldAlert className="h-4 w-4 animate-bounce" /> Pendiente
                      </div>
                    )}
                    <div className="bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 w-fit uppercase">
                      <span>Nivel {levelInfo.level}: {animalNames[levelInfo.level]} (${levelInfo.totalPaidUsd.toFixed(2)} USD)</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-3.5 bg-zinc-950/40 p-4 border border-border rounded-xl">
                <h4 className="font-bold text-primary text-[10px] uppercase tracking-widest border-b border-border/50 pb-1">
                  Información Básica
                </h4>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-muted-foreground">Cédula:</span>
                  <span className="col-span-2 font-semibold font-mono">{selectedUser.cedula}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-muted-foreground">Teléfono:</span>
                  <span className="col-span-2 font-semibold font-mono">{selectedUser.telefono}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-muted-foreground">Profesión:</span>
                  <span className="col-span-2 font-semibold">{selectedUser.profesion}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-muted-foreground">Trabaja:</span>
                  <span className="col-span-2 font-semibold">{selectedUser.trabajando}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-muted-foreground">Días cobro:</span>
                  <span className="col-span-2 font-semibold">{selectedUser.diasCobro}</span>
                </div>
              </div>

              <div className="space-y-3.5 bg-zinc-950/40 p-4 border border-border rounded-xl">
                <h4 className="font-bold text-primary text-[10px] uppercase tracking-widest border-b border-border/50 pb-1">
                  Ubicación y Dirección
                </h4>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-muted-foreground">Ciudad:</span>
                  <span className="col-span-2 font-semibold">{selectedUser.ciudad}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-muted-foreground">Municipio:</span>
                  <span className="col-span-2 font-semibold">{selectedUser.municipio}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-muted-foreground">Calle/Av:</span>
                  <span className="col-span-2 font-semibold truncate" title={selectedUser.calle}>{selectedUser.calle}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-muted-foreground">Punto Ref:</span>
                  <span className="col-span-2 font-semibold truncate" title={selectedUser.referencias}>{selectedUser.referencias}</span>
                </div>
              </div>
            </div>

            {/* Document Links Section */}
            <div className="bg-zinc-950/40 p-4 border border-border rounded-xl space-y-3">
              <h4 className="font-bold text-primary text-[10px] uppercase tracking-widest border-b border-border/50 pb-1">
                Documentación de Identidad (Drive)
              </h4>
              <div className="flex flex-col sm:flex-row gap-3">
                {selectedUser.driveLink ? (
                  <a
                    href={selectedUser.driveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 rounded-lg border border-border bg-card p-3 hover:bg-secondary transition-colors flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center gap-2">
                      <ImageIcon className="h-4.5 w-4.5 text-primary" /> Foto de Cédula de Identidad
                    </span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                ) : (
                  <div className="flex-1 rounded-lg border border-dashed border-border p-3 text-center text-muted-foreground text-xs">
                    Sin foto de cédula registrada
                  </div>
                )}

                {selectedUser.rostroDriveLink ? (
                  <a
                    href={selectedUser.rostroDriveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 rounded-lg border border-border bg-card p-3 hover:bg-secondary transition-colors flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center gap-2">
                      <ImageIcon className="h-4.5 w-4.5 text-primary" /> Foto del Rostro (Selfie)
                    </span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                ) : (
                  <div className="flex-1 rounded-lg border border-dashed border-border p-3 text-center text-muted-foreground text-xs">
                    Sin foto de rostro registrada
                  </div>
                )}
              </div>
            </div>

            {/* Verification Form Section */}
            <div className="border border-border p-4 rounded-xl space-y-4">
              <h4 className="font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-primary" /> Control de Validación y Verificación
              </h4>

              <form onSubmit={handleSaveUserVerification} className="space-y-4">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="verificarStatus"
                      value="VERIFICADA"
                      checked={verificando === "VERIFICADA"}
                      onChange={() => setVerificando("VERIFICADA")}
                      className="accent-primary h-4 w-4"
                    />
                    Verificar y Validar Cédula (VERIFICADA)
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="verificarStatus"
                      value="NO_VERIFICADA"
                      checked={verificando === "NO_VERIFICADA"}
                      onChange={() => setVerificando("NO_VERIFICADA")}
                      className="accent-primary h-4 w-4"
                    />
                    Marcar como No Verificada (Pendiente/Rechazada)
                  </label>
                </div>

                <div className="space-y-1.5 text-xs">
                  <label className="text-muted-foreground font-semibold">
                    Motivo o Notas de Validación (Visible para el Cliente):
                  </label>
                  <textarea
                    rows={2}
                    value={verificacionMotivo}
                    onChange={(e) => setVerificacionMotivo(e.target.value)}
                    placeholder="Ej. Cédula legible coincidente con el rostro / La foto está muy borrosa, por favor suba otra..."
                    className="w-full bg-zinc-950 border border-border rounded-lg p-2.5 focus:border-primary focus:outline-none transition-colors resize-none"
                  />
                </div>

                {verifyError && (
                  <p className="text-xs text-destructive font-semibold">✗ {verifyError}</p>
                )}

                <button
                  type="submit"
                  disabled={savingUserVerify}
                  className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity w-full sm:w-auto"
                >
                  {savingUserVerify ? "GUARDANDO..." : "GUARDAR ESTATUS DE VERIFICACIÓN"}
                </button>
              </form>
            </div>

            {/* Password Reset Generation Panel inside user profile */}
            <div className="border border-border/80 bg-zinc-950/20 p-4 rounded-xl space-y-4">
              <h4 className="font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="h-4 w-4 text-primary" /> Generador de Enlace de Contraseña
              </h4>

              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={selectedUser.telefono}
                    className="bg-zinc-950 border border-border px-3.5 py-2 text-xs rounded-lg text-muted-foreground font-mono w-full max-w-[200px]"
                  />
                  <button
                    onClick={handleGeneratePasswordLink}
                    disabled={resetLoading}
                    className="rounded-md bg-secondary border border-border text-foreground hover:bg-muted px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {resetLoading ? "GENERANDO..." : "GENERAR ENLACE"}
                  </button>
                </div>

                {resetError && <p className="text-xs text-destructive">✗ {resetError}</p>}

                {generatedLink && (
                  <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
                    <p className="text-[10px] tracking-wider text-primary uppercase font-bold">
                      Enlace de restablecimiento generado:
                    </p>
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        readOnly
                        value={generatedLink}
                        className="flex-1 bg-zinc-950 border border-border px-3 py-1.5 text-xs rounded-md text-muted-foreground select-all outline-none"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedLink)
                          setCopiedResetLink(true)
                          setTimeout(() => setCopiedResetLink(false), 2000)
                        }}
                        className="h-8 w-8 flex items-center justify-center border border-border rounded-md bg-card hover:bg-secondary transition-colors"
                        title="Copiar Enlace"
                      >
                        {copiedResetLink ? (
                          <Check className="h-4.5 w-4.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-4.5 w-4.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* History of loans of this client */}
            <div className="space-y-3">
              <h4 className="font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" /> Historial Consolidado de Préstamos (Web + WhatsApp / Manual)
              </h4>

              <div className="border border-border rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-950 border-b border-border text-muted-foreground font-semibold">
                      <th className="px-4 py-2.5">Canal</th>
                      <th className="px-4 py-2.5">F. Solicitud</th>
                      <th className="px-4 py-2.5">F. Pago</th>
                      <th className="px-4 py-2.5">Modalidad</th>
                      <th className="px-4 py-2.5 text-right">Monto</th>
                      <th className="px-4 py-2.5 text-right">Total a Pagar</th>
                      <th className="px-4 py-2.5">Mora / Notas</th>
                      <th className="px-4 py-2.5 text-center">Estatus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinedUserLoans.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
                          El cliente no registra solicitudes ni préstamos en el historial aún.
                        </td>
                      </tr>
                    ) : (
                      combinedUserLoans.map((l: any, i: number) => {
                        const isWeb = l.source === "Web"
                        const isPagado = l.estado.toLowerCase() === "pagado"
                        const isRechazado = l.estado.toLowerCase() === "rechazado"
                        return (
                          <tr key={i} className="border-b border-border/40 hover:bg-zinc-950/20 transition-colors">
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                isWeb ? "bg-blue-500/10 border border-blue-500/20 text-blue-400" : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                              }`}>
                                {l.source}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground font-mono">{l.fechaSolicitud}</td>
                            <td className="px-4 py-3 text-muted-foreground font-mono">{l.fechaPago}</td>
                            <td className="px-4 py-3 font-medium">{l.modalidad}</td>
                            <td className="px-4 py-3 text-right font-mono font-semibold">{l.monto}</td>
                            <td className="px-4 py-3 text-right text-primary font-mono font-semibold">{l.totalPagar}</td>
                            <td className="px-4 py-3 text-muted-foreground font-mono text-[10px] leading-tight">
                              {l.mora !== "N/A" && l.mora && (
                                <span className="text-red-400 font-semibold block mb-1">Mora: {l.mora}</span>
                              )}
                              {l.referencia && l.referencia !== "N/A" && (
                                <p className="mb-1">Ref: <span className="font-semibold text-foreground">{l.referencia}</span> {l.monedaPago && `(${l.monedaPago})`}</p>
                              )}
                              {l.notaPago && (
                                <div className="space-y-0.5 mt-1">
                                  {l.notaPago.split("|").map((item: string, idx: number) => {
                                    const clean = item.trim()
                                    if (!clean) return null
                                    return (
                                      <p key={idx} className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.5 rounded w-fit">
                                        ✓ {clean}
                                      </p>
                                    )
                                  })}
                                </div>
                              )}
                              {!(l.mora && l.mora !== "N/A") && !(l.referencia && l.referencia !== "N/A") && !l.notaPago && <span>-</span>}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                isPagado ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                isRechazado ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                                "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              }`}>
                                {l.estado}
                              </span>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Registrar Préstamo Manual */}
      {isManualLoanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border w-full max-w-lg p-6 rounded-2xl relative shadow-2xl space-y-5 my-8">
            <button
              onClick={() => {
                setIsManualLoanModalOpen(false)
                setManualClientSearch("")
                setIsClientDropdownOpen(false)
                setManualError(null)
                setManualSuccess(null)
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-secondary rounded-lg"
            >
              <XCircle className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-primary border-b border-border pb-3">
              <PlusCircle className="h-5.5 w-5.5" />
              <h3 className="font-heading text-base font-bold text-foreground">
                Registrar Préstamo Manual (Pre-Aprobado)
              </h3>
            </div>

            <form onSubmit={handleCreateManualLoan} className="space-y-4 text-xs">
              {/* Client Selector Dropdown */}
              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Seleccionar Cliente Registrado:</label>
                <div className="relative">
                  {/* Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                    className="w-full bg-zinc-950 border border-border rounded-lg px-3.5 py-2.5 text-left text-xs focus:border-primary focus:outline-none flex items-center justify-between hover:bg-secondary/40 transition-colors"
                  >
                    <span className="truncate">
                      {selectedManualClientObj ? (
                        `${selectedManualClientObj.nombres} ${selectedManualClientObj.apellidos} (C.I. ${selectedManualClientObj.cedula} - Tlf: ${selectedManualClientObj.telefono})`
                      ) : (
                        <span className="text-muted-foreground">-- Selecciona o busca un cliente --</span>
                      )}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isClientDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {/* Dropdown Popover */}
                  {isClientDropdownOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-1.5 bg-zinc-950 border border-border rounded-xl shadow-2xl p-2.5 space-y-2 max-h-[300px] overflow-y-auto">
                      {/* Search Input inside Dropdown */}
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Buscar por nombre, cédula o teléfono..."
                          value={manualClientSearch}
                          onChange={(e) => setManualClientSearch(e.target.value)}
                          className="w-full bg-zinc-900 border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs focus:border-primary focus:outline-none text-foreground"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      {/* Dropdown List */}
                      <div className="space-y-1 max-h-[200px] overflow-y-auto divide-y divide-border/20">
                        {filteredManualDropdownClients.length === 0 ? (
                          <p className="p-3 text-center text-muted-foreground text-[11px]">No se encontraron clientes.</p>
                        ) : (
                          filteredManualDropdownClients.map((u: any, idx: number) => {
                            const isSelected = u.telefono === manualClientSelected
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setManualClientSelected(u.telefono)
                                  setManualClientSearch("")
                                  setIsClientDropdownOpen(false)
                                }}
                                className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex flex-col gap-0.5 hover:bg-primary/10 hover:text-primary ${
                                  isSelected ? "bg-primary/20 text-primary font-semibold" : "text-foreground"
                                }`}
                              >
                                <span className="font-medium text-foreground">{u.nombres} {u.apellidos}</span>
                                <span className="text-[10px] text-muted-foreground">C.I. {u.cedula} • Tlf: {u.telefono}</span>
                              </button>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Show selected client mini-profile */}
              {selectedManualClientObj && (
                <div className="bg-zinc-950/50 border border-border/80 p-3 rounded-lg grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-muted-foreground">Nombres: </span>
                    <span className="font-semibold">{selectedManualClientObj.nombres} {selectedManualClientObj.apellidos}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cédula: </span>
                    <span className="font-semibold font-mono">{selectedManualClientObj.cedula}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Teléfono: </span>
                    <span className="font-semibold font-mono">{selectedManualClientObj.telefono}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Verificación: </span>
                    <span className={`font-bold ${selectedManualClientObj.verificado === "VERIFICADA" ? "text-emerald-400" : "text-amber-400"}`}>
                      {selectedManualClientObj.verificado}
                    </span>
                  </div>
                </div>
              )}

              {/* Moneda, Monto & Modalidad Row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Moneda:</label>
                  <select
                    value={manualMoneda}
                    onChange={(e) => setManualMoneda(e.target.value)}
                    className="w-full bg-zinc-950 border border-border rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="Bs.">Bolívares (Bs.)</option>
                    <option value="$">Dólares ($)</option>
                    <option value="€">Euros (€)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Monto ({manualMoneda}):</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ej. 1500"
                    value={manualMonto}
                    onChange={(e) => setManualMonto(e.target.value)}
                    className="w-full bg-zinc-950 border border-border rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Modalidad:</label>
                  <select
                    value={manualModalidad}
                    onChange={(e) => setManualModalidad(e.target.value)}
                    className="w-full bg-zinc-950 border border-border rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="Pago Total">Pago Total (Contado)</option>
                    <option value="Cuotas">Cuotas (2 Cuotas)</option>
                  </select>
                </div>
              </div>

              {/* Interest calculation Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Tasa de Interés (%):</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Ej. 54"
                    value={manualInteres}
                    onChange={(e) => {
                      setManualInteres(e.target.value)
                      setManualCustomTotal("")
                    }}
                    className="w-full bg-zinc-950 border border-border rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Total a Pagar Manual (Opcional):</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Sobrescribir total..."
                    value={manualCustomTotal}
                    onChange={(e) => setManualCustomTotal(e.target.value)}
                    className="w-full bg-zinc-950 border border-border rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Dates & Status Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Fecha(s) de Pago (Texto):</label>
                  <input
                    type="text"
                    placeholder="Ej. 15-07-2026 o 15/07 y 30/07"
                    value={manualFechas}
                    onChange={(e) => setManualFechas(e.target.value)}
                    className="w-full bg-zinc-950 border border-border rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Estatus Inicial del Préstamo:</label>
                  <select
                    value={manualEstado}
                    onChange={(e) => setManualEstado(e.target.value)}
                    className="w-full bg-zinc-950 border border-border rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="Aprobado">Aprobado (Por Cobrar)</option>
                    <option value="Pendiente">Pendiente (Por Confirmar)</option>
                    <option value="Pagado">Pagado (Completado)</option>
                  </select>
                </div>
              </div>

              {/* Live Preview Math */}
              <div className="bg-zinc-950/40 border border-border p-3 rounded-lg space-y-1.5 text-[11px]">
                <h4 className="font-bold text-primary text-[10px] uppercase tracking-wider mb-1">Cálculo de Desembolso</h4>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monto Base:</span>
                  <span className="font-semibold font-mono">{manualMoneda} {manualMonto ? parseFloat(manualMonto).toLocaleString("es-VE", { minimumFractionDigits: 2 }) : "0,00"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recargo de Intereses ({manualCustomTotal ? "Personalizado" : `${manualInteres}%`}):</span>
                  <span className="font-semibold font-mono">{manualMoneda} {manualMonto ? (computedManualTotal - (parseFloat(manualMonto) || 0)).toLocaleString("es-VE", { minimumFractionDigits: 2 }) : "0,00"}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1.5 text-foreground font-bold">
                  <span>Total a Devolver:</span>
                  <span className="text-primary font-mono">{manualMoneda} {computedManualTotal.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
                </div>
                {manualModalidad === "Cuotas" && (
                  <div className="flex justify-between text-muted-foreground text-[10px]">
                    <span>Detalle Cuotas (2 Cuotas):</span>
                    <span className="font-mono">2 cuotas de {manualMoneda} {computedManualCuota.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>

              {manualError && <p className="text-xs text-destructive font-semibold">✗ {manualError}</p>}
              {manualSuccess && <p className="text-xs text-emerald-500 font-semibold">✓ {manualSuccess}</p>}

              <button
                type="submit"
                disabled={manualSubmitting || manualSuccess !== null}
                className="w-full rounded-md bg-primary py-2.5 text-xs font-semibold tracking-widest text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-opacity"
              >
                {manualSubmitting ? "REGISTRANDO PRÉSTAMO..." : "CONFIRMAR Y GUARDAR REGISTRO"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Registrar Cliente WhatsApp */}
      {isWhatsAppModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border w-full max-w-xl p-6 rounded-2xl relative shadow-2xl space-y-4 my-8">
            <button
              onClick={() => {
                setIsWhatsAppModalOpen(false)
                setWaError(null)
                setWaSuccess(null)
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-secondary rounded-lg"
            >
              <XCircle className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-primary border-b border-border pb-3">
              <PlusCircle className="h-5.5 w-5.5" />
              <h3 className="font-heading text-base font-bold text-foreground">
                Registrar Cliente de WhatsApp (Manual)
              </h3>
            </div>

            <form onSubmit={handleRegisterWhatsAppClient} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Nombres:</label>
                  <input
                    type="text"
                    placeholder="Ej. Juan Carlos"
                    value={waNombres}
                    onChange={(e) => setWaNombres(e.target.value)}
                    className="w-full bg-zinc-950 border border-border rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Apellidos:</label>
                  <input
                    type="text"
                    placeholder="Ej. Perez Diaz"
                    value={waApellidos}
                    onChange={(e) => setWaApellidos(e.target.value)}
                    className="w-full bg-zinc-950 border border-border rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Cédula de Identidad:</label>
                  <input
                    type="text"
                    placeholder="Ej. V20123456"
                    value={waCedula}
                    onChange={(e) => setWaCedula(e.target.value)}
                    className="w-full bg-zinc-950 border border-border rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Teléfono celular:</label>
                  <input
                    type="text"
                    placeholder="Ej. 04121234567"
                    value={waTelefono}
                    onChange={(e) => setWaTelefono(e.target.value)}
                    className="w-full bg-zinc-950 border border-border rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Profesión:</label>
                  <input
                    type="text"
                    placeholder="Ej. Electricista"
                    value={waProfesion}
                    onChange={(e) => setWaProfesion(e.target.value)}
                    className="w-full bg-zinc-950 border border-border rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Días de cobro:</label>
                  <input
                    type="text"
                    placeholder="Ej. Quincenal"
                    value={waDiasCobro}
                    onChange={(e) => setWaDiasCobro(e.target.value)}
                    className="w-full bg-zinc-950 border border-border rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">¿Actualmente Trabajando?</label>
                  <select
                    value={waTrabajando}
                    onChange={(e) => setWaTrabajando(e.target.value)}
                    className="w-full bg-zinc-950 border border-border rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="Sí">Sí</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Ciudad:</label>
                  <input
                    type="text"
                    placeholder="Ej. Barcelona"
                    value={waCiudad}
                    onChange={(e) => setWaCiudad(e.target.value)}
                    className="w-full bg-zinc-950 border border-border rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Municipio:</label>
                  <input
                    type="text"
                    placeholder="Ej. Bolivar"
                    value={waMunicipio}
                    onChange={(e) => setWaMunicipio(e.target.value)}
                    className="w-full bg-zinc-950 border border-border rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Calle / Sector / Dirección exacta:</label>
                <input
                  type="text"
                  placeholder="Ej. Calle 3 de Barrio Sucre, Casa Nro 45..."
                  value={waCalle}
                  onChange={(e) => setWaCalle(e.target.value)}
                  className="w-full bg-zinc-950 border border-border rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Punto de Referencia (Ubicación):</label>
                <input
                  type="text"
                  placeholder="Ej. Al frente de la panadería la espiga de oro..."
                  value={waReferencias}
                  onChange={(e) => setWaReferencias(e.target.value)}
                  className="w-full bg-zinc-950 border border-border rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              {waError && <p className="text-xs text-destructive font-semibold">✗ {waError}</p>}
              {waSuccess && <p className="text-xs text-emerald-500 font-semibold">✓ {waSuccess}</p>}

              <button
                type="submit"
                disabled={waSubmitting || waSuccess !== null}
                className="w-full rounded-md bg-primary py-2.5 text-xs font-semibold tracking-widest text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-opacity"
              >
                {waSubmitting ? "REGISTRANDO CLIENTE..." : "CONFIRMAR Y CREAR CLIENTE"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Verificación de Pago y Carga de Comprobante (OCR) */}
      {isPaymentModalOpen && selectedPaymentLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border w-full max-w-md p-6 rounded-2xl relative shadow-2xl space-y-4 my-8">
            <button
              onClick={closePaymentModal}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-secondary rounded-lg"
            >
              <XCircle className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-primary border-b border-border pb-3">
              <DollarSign className="h-5.5 w-5.5" />
              <h3 className="font-heading text-base font-bold text-foreground">
                Verificación de Pago del Préstamo
              </h3>
            </div>

            <div className="bg-zinc-950/50 p-3.5 rounded-lg border border-border space-y-1.5 text-[11px]">
              <p><span className="text-muted-foreground">Cliente:</span> <span className="font-semibold text-foreground">{selectedPaymentLoan.nombres} {selectedPaymentLoan.apellidos}</span></p>
              <p><span className="text-muted-foreground">Cédula:</span> <span className="font-semibold font-mono">{selectedPaymentLoan.cedula}</span></p>
              <p><span className="text-muted-foreground">Monto Pendiente:</span> <span className="text-primary font-bold font-mono">{selectedPaymentLoan.totalPagar}</span></p>
              <p><span className="text-muted-foreground">Modalidad:</span> <span className="font-medium text-foreground">{selectedPaymentLoan.modalidad}</span></p>
            </div>

            <form onSubmit={handleSubmitPaymentVerification} className="space-y-4 text-xs">
              {/* Skip Comprobante Checkbox */}
              <label className="flex items-start gap-2 bg-secondary/30 border border-border/80 p-3 rounded-lg cursor-pointer hover:bg-secondary/45 transition-colors">
                <input
                  type="checkbox"
                  checked={skipComprobante}
                  onChange={(e) => {
                    setSkipComprobante(e.target.checked)
                    if (e.target.checked) {
                      setPaymentReferencia("")
                      setPaymentComprobanteBase64("")
                      setPaymentError(null)
                    }
                  }}
                  className="accent-primary h-4 w-4 shrink-0 mt-0.5"
                />
                <div>
                  <p className="font-bold text-foreground">Marcar pago de forma manual (Sin comprobante)</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                    Activa esto si no tienes una captura de pantalla y deseas confirmar el cobro directamente en Google Sheets.
                  </p>
                </div>
              </label>

              {/* Tipo de Registro: Pago Completo o Abono */}
              <div className="space-y-2 border-t border-border/40 pt-3">
                <label className="text-muted-foreground font-semibold block">Clasificación del Pago:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAbono(false)
                      setPaymentMontoAbono("")
                    }}
                    className={`py-2 px-3 rounded-lg border text-center font-semibold transition-all ${
                      !isAbono 
                        ? "bg-primary/20 border-primary text-primary" 
                        : "bg-zinc-950 border-border hover:bg-secondary/40 text-muted-foreground"
                    }`}
                  >
                    Pago Completo
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAbono(true)}
                    className={`py-2 px-3 rounded-lg border text-center font-semibold transition-all ${
                      isAbono 
                        ? "bg-primary/20 border-primary text-primary" 
                        : "bg-zinc-950 border-border hover:bg-secondary/40 text-muted-foreground"
                    }`}
                  >
                    Abono (Pago Parcial)
                  </button>
                </div>
              </div>

              {/* Si es Abono, mostrar input del monto */}
              {isAbono && (
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="text-muted-foreground font-semibold">Monto del Abono:</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ej. 500"
                    value={paymentMontoAbono}
                    onChange={(e) => setPaymentMontoAbono(e.target.value)}
                    className="w-full bg-zinc-950 border border-border rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none font-mono"
                    required={isAbono}
                  />
                  {/* Estimación de la deuda restante */}
                  {paymentMontoAbono && parseFloat(paymentMontoAbono) > 0 && (() => {
                    const currentDebt = parseAmountToFloat(selectedPaymentLoan.totalPagar)
                    const diff = Math.max(0, currentDebt - parseFloat(paymentMontoAbono))
                    return (
                      <p className="text-[10px] text-amber-400 font-medium">
                        Deuda restante estimada: Bs. {diff.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                      </p>
                    )
                  })()}
                </div>
              )}

              {!skipComprobante && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground font-semibold">Subir Foto del Comprobante de Pago:</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleComprobanteFileChange}
                      className="w-full text-xs text-muted-foreground file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 file:cursor-pointer"
                      required={!skipComprobante}
                    />
                  </div>

                  {paymentComprobanteBase64 && (
                    <div className="flex items-center justify-between bg-zinc-950/30 border border-border p-3 rounded-lg gap-2">
                      <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">Imagen del comprobante cargada.</span>
                      <button
                        type="button"
                        disabled={paymentOcrScanning}
                        onClick={handleScanReceiptOcr}
                        className="rounded-md bg-secondary hover:bg-muted border border-border text-foreground px-3 py-1.5 text-[10px] font-semibold transition-all flex items-center gap-1 uppercase shrink-0 disabled:opacity-50"
                      >
                        {paymentOcrScanning ? (
                          <>Escaneando...</>
                        ) : (
                          <>Escanear con OCR AI</>
                        )}
                      </button>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-muted-foreground font-semibold">Número de Referencia de Transacción:</label>
                    <input
                      type="text"
                      placeholder="Ej. 24896740"
                      value={paymentReferencia}
                      onChange={(e) => setPaymentReferencia(e.target.value)}
                      className="w-full bg-zinc-950 border border-border rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none font-mono"
                      required={!skipComprobante}
                    />
                    <p className="text-[9px] text-muted-foreground">
                      * Este número servirá para auto-nombrar la imagen en Google Drive (`&lt;referencia&gt;.png`).
                    </p>
                  </div>
                </>
              )}

              {/* Moneda & Nota de Pago */}
              <div className="space-y-3 border-t border-border/60 pt-3">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Moneda del Pago:</label>
                  <select
                    value={paymentMoneda}
                    onChange={(e) => setPaymentMoneda(e.target.value)}
                    className="w-full bg-zinc-950 border border-border rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="Bs.">Bolívares (Bs.)</option>
                    <option value="$">Dólares ($)</option>
                    <option value="€">Euros (€)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Nota o Comentario del Pago (Opcional):</label>
                  <textarea
                    rows={2}
                    placeholder="Ej. Transferencia desde Banco de Venezuela / Pago en efectivo..."
                    value={paymentNota}
                    onChange={(e) => setPaymentNota(e.target.value)}
                    className="w-full bg-zinc-950 border border-border rounded-lg p-2 focus:border-primary focus:outline-none transition-colors resize-none text-[11px]"
                  />
                </div>
              </div>

              {paymentError && <p className="text-xs text-destructive font-semibold">✗ {paymentError}</p>}
              {paymentSuccess && <p className="text-xs text-emerald-500 font-semibold">✓ {paymentSuccess}</p>}

              <button
                type="submit"
                disabled={paymentSubmitting || paymentSuccess !== null}
                className="w-full rounded-md bg-primary py-2.5 text-xs font-semibold tracking-widest text-primary-foreground hover:bg-primary/95 disabled:opacity-50 transition-opacity uppercase"
              >
                {paymentSubmitting ? "REGISTRANDO PAGO EN SISTEMA..." : "CONFIRMAR Y VERIFICAR PAGO"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Detalles de Préstamo */}
      {isEditLoanModalOpen && editingLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border w-full max-w-md p-6 rounded-2xl relative shadow-2xl space-y-4 my-8">
            <button
              onClick={() => {
                setIsEditLoanModalOpen(false)
                setEditingLoan(null)
                setConvAmount("")
                setConvFrom("USD")
                setConvTo("VES")
                setEditMonedaMonto("Bs.")
                setEditMonedaDeuda("Bs.")
                setEditError(null)
                setEditSuccess(null)
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-secondary rounded-lg"
            >
              <XCircle className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-primary border-b border-border pb-3">
              <FileText className="h-5.5 w-5.5" />
              <h3 className="font-heading text-base font-bold text-foreground">
                Editar Detalles del Préstamo
              </h3>
            </div>

            <div className="bg-zinc-950/50 p-3 rounded-lg border border-border space-y-1 text-[10px]">
              <p><span className="text-muted-foreground">Cliente:</span> <span className="font-semibold text-foreground">{editingLoan.nombres} {editingLoan.apellidos}</span></p>
              <p><span className="text-muted-foreground">Cédula:</span> <span className="font-semibold font-mono">{editingLoan.cedula}</span></p>
              <p><span className="text-muted-foreground">Fecha Original:</span> <span className="font-semibold font-mono">{editingLoan.timestamp}</span></p>
              <p><span className="text-muted-foreground">Origen:</span> <span className="font-bold text-primary">{editingLoan.source}</span></p>
            </div>

            <form onSubmit={handleEditLoanDetails} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-4 border-b border-border/40 pb-3">
                {/* Monto Solicitado Selector & Input */}
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Monto Solicitado:</label>
                  <div className="flex gap-1.5">
                    <select
                      value={editMonedaMonto}
                      onChange={(e) => setEditMonedaMonto(e.target.value)}
                      className="bg-zinc-950 border border-border rounded-lg px-1.5 py-2 text-xs focus:border-primary focus:outline-none shrink-0"
                    >
                      <option value="Bs.">Bs.</option>
                      <option value="$">$</option>
                      <option value="€">€</option>
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      value={editMonto}
                      onChange={(e) => setEditMonto(e.target.value)}
                      className="w-full bg-zinc-950 border border-border rounded-lg px-2 py-2 text-xs focus:border-primary focus:outline-none font-mono"
                      required
                    />
                  </div>
                </div>

                {/* Deuda Total Selector & Input */}
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Deuda Total:</label>
                  <div className="flex gap-1.5">
                    <select
                      value={editMonedaDeuda}
                      onChange={(e) => setEditMonedaDeuda(e.target.value)}
                      className="bg-zinc-950 border border-border rounded-lg px-1.5 py-2 text-xs focus:border-primary focus:outline-none shrink-0"
                    >
                      <option value="Bs.">Bs.</option>
                      <option value="$">$</option>
                      <option value="€">€</option>
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      value={editTotalPagar}
                      onChange={(e) => setEditTotalPagar(e.target.value)}
                      className="w-full bg-zinc-950 border border-border rounded-lg px-2 py-2 text-xs focus:border-primary focus:outline-none font-mono"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Convertidor de Moneda Integrado */}
              <div className="bg-zinc-950/60 p-3 rounded-lg border border-border space-y-2.5">
                <h4 className="font-bold text-primary text-[10px] uppercase tracking-wider flex items-center gap-1">
                  💱 Convertidor de Monedas (Tasa BCV: Bs. {bcvRate.toLocaleString("es-VE", { minimumFractionDigits: 2 })})
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">Monto:</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={convAmount}
                      onChange={(e) => setConvAmount(e.target.value)}
                      className="w-full bg-zinc-900 border border-border rounded px-2 py-1 text-[11px] font-mono focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">De:</label>
                    <select
                      value={convFrom}
                      onChange={(e) => setConvFrom(e.target.value)}
                      className="w-full bg-zinc-900 border border-border rounded px-2 py-1 text-[11px] focus:border-primary focus:outline-none"
                    >
                      <option value="VES">Bolívares (VES)</option>
                      <option value="USD">Dólares (USD)</option>
                      <option value="EUR">Euros (EUR)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">A:</label>
                    <select
                      value={convTo}
                      onChange={(e) => setConvTo(e.target.value)}
                      className="w-full bg-zinc-900 border border-border rounded px-2 py-1 text-[11px] focus:border-primary focus:outline-none"
                    >
                      <option value="VES">Bolívares (VES)</option>
                      <option value="USD">Dólares (USD)</option>
                      <option value="EUR">Euros (EUR)</option>
                    </select>
                  </div>
                </div>

                {convAmount && parseFloat(convAmount) > 0 && (() => {
                  const amount = parseFloat(convAmount) || 0
                  let result = amount
                  if (convFrom === "USD" && convTo === "VES") result = amount * bcvRate
                  else if (convFrom === "VES" && convTo === "USD") result = amount / bcvRate
                  else if (convFrom === "EUR" && convTo === "VES") result = amount * (bcvRate * 1.08)
                  else if (convFrom === "VES" && convTo === "EUR") result = amount / (bcvRate * 1.08)
                  else if (convFrom === "USD" && convTo === "EUR") result = amount / 1.08
                  else if (convFrom === "EUR" && convTo === "USD") result = amount * 1.08

                  return (
                    <div className="flex items-center justify-between text-[11px] bg-zinc-900/50 p-2 rounded border border-border/40">
                      <div>
                        <span className="text-muted-foreground">Resultado: </span>
                        <span className="font-bold text-emerald-400 font-mono">{result.toLocaleString("es-VE", { minimumFractionDigits: 2 })} {convTo}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditMonto(result.toFixed(2))}
                          className="bg-primary/20 hover:bg-primary/35 text-primary border border-primary/20 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase transition-colors"
                        >
                          Usar en Monto
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditTotalPagar(result.toFixed(2))}
                          className="bg-primary/20 hover:bg-primary/35 text-primary border border-primary/20 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase transition-colors"
                        >
                          Usar en Deuda
                        </button>
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Modalidad:</label>
                  <select
                    value={editModalidad}
                    onChange={(e) => setEditModalidad(e.target.value)}
                    className="w-full bg-zinc-950 border border-border rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="Pago Total">Pago Total (Contado)</option>
                    <option value="Cuotas">Cuotas (2 Cuotas)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Estatus:</label>
                  <select
                    value={editEstado}
                    onChange={(e) => setEditEstado(e.target.value)}
                    className="w-full bg-zinc-950 border border-border rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Aprobado">Aprobado / Por Pagar</option>
                    <option value="Pagado">Pagado / Completado</option>
                    <option value="Rechazado">Rechazado</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Fecha(s) de Pago (Texto):</label>
                <input
                  type="text"
                  value={editFechas}
                  onChange={(e) => setEditFechas(e.target.value)}
                  className="w-full bg-zinc-950 border border-border rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Referencia de Pago (Opcional):</label>
                <input
                  type="text"
                  placeholder="Ej. 24896740"
                  value={editReferencia}
                  onChange={(e) => setEditReferencia(e.target.value)}
                  className="w-full bg-zinc-950 border border-border rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none font-mono"
                />
              </div>

              {editError && <p className="text-xs text-destructive font-semibold">✗ {editError}</p>}
              {editSuccess && <p className="text-xs text-emerald-500 font-semibold">✓ {editSuccess}</p>}

              <button
                type="submit"
                disabled={editSubmitting || editSuccess !== null}
                className="w-full rounded-md bg-primary py-2.5 text-xs font-semibold tracking-widest text-primary-foreground hover:bg-primary/95 disabled:opacity-50 transition-opacity uppercase"
              >
                {editSubmitting ? "GUARDANDO CAMBIOS..." : "GUARDAR CAMBIOS"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
