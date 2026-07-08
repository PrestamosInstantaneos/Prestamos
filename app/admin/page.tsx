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
  const [activeTab, setActiveTab] = useState<"stats" | "users" | "loans">("stats")

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
  const [verificando, setVerificando] = useState<"VERIFICADA" | "NO_VERIFICADA">("NO_VERIFICADA")
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
  const [manualMonto, setManualMonto] = useState("")
  const [manualModalidad, setManualModalidad] = useState("Pago Total")
  const [manualInteres, setManualInteres] = useState("25") // Default 25% interest
  const [manualFechas, setManualFechas] = useState("")
  const [manualCustomTotal, setManualCustomTotal] = useState("")
  const [manualEstado, setManualEstado] = useState("Aprobado")
  const [manualSubmitting, setManualSubmitting] = useState(false)
  const [manualError, setManualError] = useState<string | null>(null)
  const [manualSuccess, setManualSuccess] = useState<string | null>(null)

  // Sub-states: Search and filters
  const [userSearch, setUserSearch] = useState("")
  const [userFilter, setUserFilter] = useState("all") // all, verified, unverified

  const [loanSearch, setLoanSearch] = useState("")
  const [loanFilter, setLoanFilter] = useState("all") // all, pendiente, aprobado, rechazado, pagado

  // Action loading states
  const [updatingLoanId, setUpdatingLoanId] = useState<string | null>(null)

  // Helper lists from SWR data
  const users = data?.users || []
  const loans = data?.loans || []

  // Pre-fill fields for manual loan form based on client selection
  const selectedManualClientObj = useMemo(() => {
    return users.find((u: any) => u.telefono === manualClientSelected) || null
  }, [manualClientSelected, users])

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
        (userFilter === "unverified" && u.verificado !== "VERIFICADA")

      return matchesSearch && matchesFilter
    })
  }, [users, userSearch, userFilter])

  const filteredLoans = useMemo(() => {
    return loans.filter((l: any) => {
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
  }, [loans, loanSearch, loanFilter])

  // Statistics computations
  const stats = useMemo(() => {
    const totalUsersCount = users.length
    const verifiedUsersCount = users.filter((u: any) => u.verificado === "VERIFICADA").length
    const unverifiedUsersCount = totalUsersCount - verifiedUsersCount

    const totalLoansCount = loans.length
    const pendingLoans = loans.filter((l: any) => l.estado.toLowerCase() === "pendiente")
    const approvedLoans = loans.filter((l: any) =>
      l.estado.toLowerCase() === "aprobado" ||
      l.estado.toLowerCase() === "por pagar" ||
      l.estado.toLowerCase() === "pendiente por pagar"
    )
    const paidLoans = loans.filter((l: any) => l.estado.toLowerCase() === "pagado")
    const rejectedLoans = loans.filter((l: any) => l.estado.toLowerCase() === "rechazado")

    // Calculations of volumes and earnings
    let totalRequestedBs = 0
    let totalApprovedBs = 0
    let totalPaidBs = 0
    let totalInterestBs = 0 // totalPagar - monto (only for approved/paid)

    loans.forEach((l: any) => {
      const base = parseAmount(l.monto)
      const pay = parseAmount(l.totalPagar)
      const state = l.estado.toLowerCase()

      totalRequestedBs += base

      if (state === "aprobado" || state === "por pagar" || state === "pendiente por pagar" || state === "pagado") {
        totalApprovedBs += base
        totalInterestBs += Math.max(0, pay - base)
      }

      if (state === "pagado") {
        totalPaidBs += base
      }
    })

    return {
      totalUsersCount,
      verifiedUsersCount,
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
    }
  }, [users, loans, bcvRate])

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
        </div>

        {/* Loading overlay when re-validating */}
        {isValidating && (
          <div className="text-right text-[10px] text-primary/80 font-semibold mb-2 animate-pulse flex items-center justify-end gap-1.5">
            <RefreshCw className="h-3 w-3 animate-spin" /> SINCRONIZANDO CON GOOGLE SHEETS...
          </div>
        )}

        {/* Tab 1: Stats & Growth */}
        {activeTab === "stats" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Charts section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Earnings Growth Projection Visual */}
              <div className="bg-card border border-border p-6 rounded-2xl shadow-xl">
                <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
                  Distribución Financiera de la Plataforma
                </h3>
                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span>Total Solicitado</span>
                      <span className="font-bold">Bs. {stats.totalRequestedBs.toLocaleString("es-VE")}</span>
                    </div>
                    <div className="w-full h-2.5 bg-zinc-950 border border-border rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: "100%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span>Total Desembolsado (Aprobado/Pagado)</span>
                      <span className="font-bold">
                        Bs. {stats.totalApprovedBs.toLocaleString("es-VE")}{" "}
                        <span className="text-[10px] text-muted-foreground">
                          ({stats.totalRequestedBs > 0 ? Math.round((stats.totalApprovedBs / stats.totalRequestedBs) * 100) : 0}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-zinc-950 border border-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-1000"
                        style={{ width: `${stats.totalRequestedBs > 0 ? (stats.totalApprovedBs / stats.totalRequestedBs) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span>Retorno Cobrado (Préstamos Pagados)</span>
                      <span className="font-bold">
                        Bs. {stats.totalPaidBs.toLocaleString("es-VE")}{" "}
                        <span className="text-[10px] text-muted-foreground">
                          ({stats.totalApprovedBs > 0 ? Math.round((stats.totalPaidBs / stats.totalApprovedBs) * 100) : 0}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-zinc-950 border border-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-1000"
                        style={{ width: `${stats.totalApprovedBs > 0 ? (stats.totalPaidBs / stats.totalApprovedBs) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5 text-primary">
                      <span>Ganancia Estimada de Intereses</span>
                      <span className="font-bold">
                        Bs. {stats.totalInterestBs.toLocaleString("es-VE")}
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-zinc-950 border border-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-orange-400 transition-all duration-1000"
                        style={{ width: `${stats.totalApprovedBs > 0 ? Math.min(100, (stats.totalInterestBs / stats.totalApprovedBs) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Loan Status Visual Breakdown */}
              <div className="bg-card border border-border p-6 rounded-2xl shadow-xl">
                <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
                  Estatus de Solicitudes y Actividad
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-border bg-zinc-950/30 p-4 rounded-xl text-center">
                    <p className="text-2xl font-bold tracking-tight text-amber-500">{stats.pendingCount}</p>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Pendientes</p>
                    <div className="text-[9px] text-muted-foreground mt-0.5">En espera de verificación manual</div>
                  </div>

                  <div className="border border-border bg-zinc-950/30 p-4 rounded-xl text-center">
                    <p className="text-2xl font-bold tracking-tight text-blue-400">{stats.approvedCount}</p>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Activos</p>
                    <div className="text-[9px] text-muted-foreground mt-0.5">Aprobados por cobrar/pagar</div>
                  </div>

                  <div className="border border-border bg-zinc-950/30 p-4 rounded-xl text-center">
                    <p className="text-2xl font-bold tracking-tight text-emerald-400">{stats.paidCount}</p>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Pagados</p>
                    <div className="text-[9px] text-muted-foreground mt-0.5">Liquidaciones completadas</div>
                  </div>

                  <div className="border border-border bg-zinc-950/30 p-4 rounded-xl text-center">
                    <p className="text-2xl font-bold tracking-tight text-zinc-400">{stats.rejectedCount}</p>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Rechazados</p>
                    <div className="text-[9px] text-muted-foreground mt-0.5">No aprobados / fallidos</div>
                  </div>
                </div>

                <div className="mt-5 border-t border-border pt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Relación de Aprobación Global</span>
                    <span className="font-semibold text-foreground">
                      {stats.totalLoansCount > 0
                        ? Math.round(((stats.approvedCount + stats.paidCount) / stats.totalLoansCount) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
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
          </div>
        )}

        {/* Tab 2: User Monitoring */}
        {activeTab === "users" && (
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

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="w-full sm:w-auto bg-zinc-950 border border-border rounded-lg px-3.5 py-2 text-xs focus:border-primary focus:outline-none"
                >
                  <option value="all">Verificación: Todos</option>
                  <option value="verified">Solo Verificados</option>
                  <option value="unverified">Solo Pendientes / No Verificados</option>
                </select>
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
                            <td className="px-5 py-4 text-primary font-semibold font-mono">{l.totalPagar}</td>
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
                                        onClick={() => handleUpdateLoanStatus(l, "Pagado")}
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

              {selectedUser.verificado === "VERIFICADA" ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 w-fit uppercase">
                  <ShieldCheck className="h-4 w-4" /> Cliente Verificado
                </div>
              ) : (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 w-fit uppercase">
                  <ShieldAlert className="h-4 w-4 animate-bounce" /> Pendiente de Verificación
                </div>
              )}
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
                <FileText className="h-4 w-4 text-primary" /> Historial de Préstamos del Cliente
              </h4>

              <div className="border border-border rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-950 border-b border-border text-muted-foreground font-semibold">
                      <th className="px-4 py-2.5">Fecha</th>
                      <th className="px-4 py-2.5">Modalidad</th>
                      <th className="px-4 py-2.5">Monto</th>
                      <th className="px-4 py-2.5">Total a Pagar</th>
                      <th className="px-4 py-2.5">Estatus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.filter((l: any) => l.cedula.replace(/\D/g, "") === selectedUser.cedula.replace(/\D/g, "")).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                          El cliente no registra solicitudes de préstamo aún.
                        </td>
                      </tr>
                    ) : (
                      loans
                        .filter((l: any) => l.cedula.replace(/\D/g, "") === selectedUser.cedula.replace(/\D/g, ""))
                        .map((l: any, i: number) => (
                          <tr key={i} className="border-b border-border/40 hover:bg-zinc-950/20 transition-colors">
                            <td className="px-4 py-3 text-muted-foreground">{l.timestamp}</td>
                            <td className="px-4 py-3 font-medium">{l.modalidad}</td>
                            <td className="px-4 py-3 font-semibold font-mono">{l.monto}</td>
                            <td className="px-4 py-3 text-primary font-semibold font-mono">{l.totalPagar}</td>
                            <td className="px-4 py-3 font-bold uppercase text-[10px]">
                              {l.estado}
                            </td>
                          </tr>
                        ))
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
                <select
                  value={manualClientSelected}
                  onChange={(e) => setManualClientSelected(e.target.value)}
                  className="w-full bg-zinc-950 border border-border rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  required
                >
                  <option value="">-- Elige un cliente --</option>
                  {users
                    .slice()
                    .sort((a: any, b: any) => a.nombres.localeCompare(b.nombres))
                    .map((u: any, idx: number) => (
                      <option key={idx} value={u.telefono}>
                        {u.nombres} {u.apellidos} (C.I. {u.cedula} - Tlf: {u.telefono})
                      </option>
                    ))}
                </select>
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

              {/* Monto & Modalidad Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Monto del Préstamo (Bs.):</label>
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
                  <label className="text-muted-foreground font-semibold">Modalidad de Pago:</label>
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
                  <select
                    value={manualInteres}
                    onChange={(e) => {
                      setManualInteres(e.target.value)
                      setManualCustomTotal("")
                    }}
                    className="w-full bg-zinc-950 border border-border rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="20">20% de recargo</option>
                    <option value="25">25% de recargo (Estándar)</option>
                    <option value="30">30% de recargo</option>
                    <option value="35">35% de recargo</option>
                    <option value="40">40% de recargo</option>
                    <option value="0">0% de recargo (Sin Interés)</option>
                  </select>
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
                  <span className="font-semibold font-mono">Bs. {manualMonto ? parseFloat(manualMonto).toLocaleString("es-VE", { minimumFractionDigits: 2 }) : "0,00"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recargo de Intereses ({manualCustomTotal ? "Personalizado" : `${manualInteres}%`}):</span>
                  <span className="font-semibold font-mono">Bs. {manualMonto ? (computedManualTotal - (parseFloat(manualMonto) || 0)).toLocaleString("es-VE", { minimumFractionDigits: 2 }) : "0,00"}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1.5 text-foreground font-bold">
                  <span>Total a Devolver:</span>
                  <span className="text-primary font-mono">Bs. {computedManualTotal.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
                </div>
                {manualModalidad === "Cuotas" && (
                  <div className="flex justify-between text-muted-foreground text-[10px]">
                    <span>Detalle Cuotas (2 Cuotas):</span>
                    <span className="font-mono">2 cuotas de Bs. {computedManualCuota.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
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
    </div>
  )
}
