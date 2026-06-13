"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import useSWR from "swr"
import { Calendar, ChevronLeft, ChevronRight, SlidersHorizontal, Clock, CheckCircle2, XCircle, Info, RefreshCw } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function getFriendlyStatus(estado: string) {
  const est = estado.trim().toLowerCase();
  if (est === "pendiente") {
    return {
      label: "PENDIENTE POR APROBAR",
      bgColor: "bg-amber-500/15 border-amber-500/25 text-amber-400",
      textColor: "text-amber-400",
      icon: Clock
    };
  }
  if (
    est === "aprobado" || 
    est === "activo" || 
    est === "por pagar" || 
    est === "pendiente por pagar" ||
    est === "pendiente_por_pagar"
  ) {
    return {
      label: "PENDIENTE POR PAGAR",
      bgColor: "bg-red-500/15 border-red-500/25 text-red-400",
      textColor: "text-red-400",
      icon: Calendar
    };
  }
  if (est === "pagado") {
    return {
      label: "PAGADO",
      bgColor: "bg-emerald-500/15 border-emerald-500/25 text-emerald-400",
      textColor: "text-emerald-400",
      icon: CheckCircle2
    };
  }
  if (est === "pagando") {
    return {
      label: "PAGANDO",
      bgColor: "bg-cyan-500/15 border-cyan-500/25 text-cyan-400",
      textColor: "text-cyan-400",
      icon: RefreshCw
    };
  }
  if (est === "rechazado") {
    return {
      label: "RECHAZADO",
      bgColor: "bg-zinc-500/15 border-zinc-500/25 text-zinc-400",
      textColor: "text-zinc-400",
      icon: XCircle
    };
  }
  return {
    label: estado.toUpperCase(),
    bgColor: "bg-blue-500/15 border-blue-500/25 text-blue-400",
    textColor: "text-blue-400",
    icon: Info
  };
}

const parseVenezuelaTimestamp = (dateStr: string): number => {
  if (!dateStr) return 0;
  try {
    const parts = dateStr.split(",");
    const datePart = parts[0].trim();
    const timePart = parts[1] ? parts[1].trim() : "";
    
    const [day, month, year] = datePart.split("/").map(Number);
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
    console.error("Error parsing date:", dateStr, e);
    return 0;
  }
};

const parseAmount = (montoStr: string): number => {
  if (!montoStr) return 0;
  try {
    const clean = montoStr
      .replace(/Bs\./g, "")
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(/,/g, ".");
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  } catch (e) {
    return 0;
  }
};

export function LoanHistory() {
  const [user, setUser] = useState<any | null>(null)
  const [estadoFilter, setEstadoFilter] = useState<string>("all")
  const [modalidadFilter, setModalidadFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("date-desc")
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)

  useEffect(() => {
    function loadUser() {
      const stored = localStorage.getItem("user")
      if (stored) {
        try {
          setUser(JSON.parse(stored))
        } catch {
          setUser(null)
        }
      } else {
        setUser(null)
      }
    }
    loadUser()
    window.addEventListener("auth-change", loadUser)
    return () => {
      window.removeEventListener("auth-change", loadUser)
    }
  }, [])

  const { data, error, mutate, isValidating } = useSWR(
    user ? "/api/my-loans?all=true" : null,
    fetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 30000,
    }
  )

  const loans = data?.loans || []
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
    }
  }

  const filteredLoans = useMemo(() => {
    return loans
      .filter((loan: any) => {
        // Filtro de Estado
        if (estadoFilter !== "all") {
          const status = loan.estado.trim().toLowerCase();
          const isPendienteAprobar = status === "pendiente";
          const isPendientePagar = ["aprobado", "activo", "por pagar", "pendiente por pagar", "pendiente_por_pagar"].includes(status);
          const isPagando = status === "pagando";
          const isPagado = status === "pagado";
          const isRechazado = status === "rechazado";

          if (estadoFilter === "pendiente-aprobar" && !isPendienteAprobar) return false;
          if (estadoFilter === "pendiente-pagar" && !isPendientePagar) return false;
          if (estadoFilter === "pagando" && !isPagando) return false;
          if (estadoFilter === "pagado" && !isPagado) return false;
          if (estadoFilter === "rechazado" && !isRechazado) return false;
        }

        // Filtro de Modalidad
        if (modalidadFilter !== "all") {
          const modality = loan.modalidad.trim().toLowerCase();
          if (modalidadFilter === "pago-total" && !modality.includes("total")) return false;
          if (modalidadFilter === "cuotas" && !modality.includes("cuota")) return false;
          if (modalidadFilter === "otros" && !modality.includes("otros")) return false;
        }

        return true;
      })
      .sort((a: any, b: any) => {
        if (sortBy === "date-desc") {
          return parseVenezuelaTimestamp(b.fechaRegistro) - parseVenezuelaTimestamp(a.fechaRegistro);
        }
        if (sortBy === "date-asc") {
          return parseVenezuelaTimestamp(a.fechaRegistro) - parseVenezuelaTimestamp(b.fechaRegistro);
        }
        if (sortBy === "amount-desc") {
          return parseAmount(b.monto) - parseAmount(a.monto);
        }
        if (sortBy === "amount-asc") {
          return parseAmount(a.monto) - parseAmount(b.monto);
        }
        return 0;
      });
  }, [loans, estadoFilter, modalidadFilter, sortBy]);

  // No mostrar nada si el usuario no ha iniciado sesión
  if (!user) {
    return null
  }

  return (
    <section id="historial" className="border-t border-border py-12 md:py-16 lg:py-20 bg-black/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div className="text-left">
            <p className="mb-2 text-xs font-semibold tracking-[0.3em] text-primary uppercase">
              Historial
            </p>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Registro de Préstamos
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl">
              Revisa el estado de todas tus solicitudes anteriores, filtra por modalidad o estado y ordénalas según necesites.
            </p>
          </div>
          
          <div className="flex gap-2.5 self-start md:self-auto">
            {/* Botón de Recargar */}
            <button
              onClick={() => mutate()}
              className={`p-2.5 rounded-xl border border-white/10 bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 transition-all ${
                isValidating ? "animate-spin" : ""
              }`}
              title="Recargar historial"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            {/* Botón de Filtros */}
            <button
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-bold uppercase tracking-wider cursor-pointer ${
                isFilterPanelOpen || estadoFilter !== "all" || modalidadFilter !== "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filtrar</span>
              {(estadoFilter !== "all" || modalidadFilter !== "all") && (
                <span className="flex h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* Panel de Filtros Desplegable */}
        {isFilterPanelOpen && (
          <div className="mb-8 rounded-2xl border border-white/10 bg-zinc-950/70 backdrop-blur-xl p-5 sm:p-6 shadow-xl animate-in slide-in-from-top-4 duration-300 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Estado */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                  Filtrar por Estado
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "all", label: "Todos" },
                    { id: "pendiente-aprobar", label: "Por Aprobar" },
                    { id: "pendiente-pagar", label: "Por Pagar" },
                    { id: "pagando", label: "Pagando" },
                    { id: "pagado", label: "Pagados" },
                    { id: "rechazado", label: "Rechazados" }
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => setEstadoFilter(btn.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer ${
                        estadoFilter === btn.id
                          ? "bg-primary/20 border-primary/45 text-white"
                          : "border-white/5 bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modalidad */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                  Filtrar por Modalidad
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "all", label: "Todas" },
                    { id: "pago-total", label: "Pago Total" },
                    { id: "cuotas", label: "Cuotas" },
                    { id: "otros", label: "Otros Montos" }
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => setModalidadFilter(btn.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer ${
                        modalidadFilter === btn.id
                          ? "bg-primary/20 border-primary/45 text-white"
                          : "border-white/5 bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ordenamiento */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                  Ordenar por
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "date-desc", label: "Fecha ⬇" },
                    { id: "date-asc", label: "Fecha ⬆" },
                    { id: "amount-desc", label: "Monto ⬇" },
                    { id: "amount-asc", label: "Monto ⬆" }
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => setSortBy(btn.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer ${
                        sortBy === btn.id
                          ? "bg-primary/20 border-primary/45 text-white"
                          : "border-white/5 bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Carrusel Deslizable de Fichas */}
        {filteredLoans.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-card/25 backdrop-blur-md p-10 text-center space-y-3">
            <Info className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground font-medium">
              {loans.length === 0 
                ? "No posees solicitudes en tu historial. ¡Calcula y solicita tu crédito arriba!" 
                : "No se encontraron solicitudes que coincidan con los filtros aplicados."}
            </p>
          </div>
        ) : (
          <div className="relative group">
            
            {/* Contenedor de scroll */}
            <div
              ref={scrollContainerRef}
              className="flex flex-row flex-nowrap gap-5 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-2 px-1 select-none"
            >
              {filteredLoans.map((loan: any, idx: number) => {
                const status = getFriendlyStatus(loan.estado)
                const StatusIcon = status.icon
                const isCuotas = loan.modalidad.trim().toLowerCase() === "cuotas"
                
                return (
                  <div
                    key={idx}
                    className="snap-start shrink-0 w-[290px] sm:w-[320px] rounded-2xl border border-white/5 bg-card/45 backdrop-blur-xl p-5 shadow-xl flex flex-col justify-between hover:border-white/10 transition-all hover:bg-card/65"
                  >
                    <div>
                      {/* Cabecera de Ficha */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {loan.fechaRegistro.split(",")[0]}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          <span className={`${status.bgColor} text-[9px] tracking-wider font-extrabold border px-2 py-0.5 rounded font-mono`}>
                            {status.label}
                          </span>
                          <StatusIcon className={`h-3.5 w-3.5 ${status.textColor}`} />
                        </div>
                      </div>

                      {/* Monto Principal */}
                      <div className="space-y-0.5 mb-4">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Monto Solicitado
                        </span>
                        <p className="text-xl sm:text-2xl font-extrabold text-primary font-heading">
                          {loan.monto}
                        </p>
                      </div>

                      {/* Detalles en Tabla */}
                      <div className="rounded-xl bg-black/20 border border-white/5 p-3 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground font-medium">Modalidad:</span>
                          <span className="font-semibold text-white">{loan.modalidad}</span>
                        </div>
                        {isCuotas && loan.montoCuota && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground font-medium">Por Cuota:</span>
                            <span className="font-semibold text-white">{loan.montoCuota}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground font-medium">Total a Pagar:</span>
                          <span className="font-semibold text-emerald-400 font-heading">{loan.totalPagar}</span>
                        </div>
                        {loan.mora && loan.mora !== "N/A" && loan.mora.trim() !== "" && (
                          <div className="flex justify-between text-red-400 font-semibold">
                            <span>Mora:</span>
                            <span>{loan.mora}</span>
                          </div>
                        )}
                        <div className="flex flex-col gap-1 pt-2 border-t border-white/5 mt-1">
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Fecha(s) de Pago:</span>
                          <span className="font-semibold text-white font-mono text-[11px] bg-black/25 px-2 py-1.5 rounded-md leading-relaxed select-all">
                            {loan.fechasPago}
                          </span>
                        </div>
                        {loan.observacion && loan.observacion.trim() !== "" && (
                          <div className="flex flex-col gap-1 border-t border-white/5 pt-2 mt-1">
                            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Observación:</span>
                            <span className="text-xs text-slate-300 italic leading-relaxed">{loan.observacion}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer de Ficha */}
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                      <span>Tasa BCV: {loan.tasaBCV || "N/A"}</span>
                      <span>{loan.fechaRegistro.split(",")[1]?.trim() || ""}</span>
                    </div>

                  </div>
                )
              })}
            </div>

            {/* Controles de deslizamiento lateral en escritorio */}
            {filteredLoans.length > 1 && (
              <>
                <button
                  onClick={() => scroll("left")}
                  className="absolute left-[-20px] top-1/2 -translate-y-1/2 p-2 rounded-full border border-white/10 bg-zinc-950/80 text-white hover:bg-zinc-800 transition-colors shadow-2xl opacity-0 group-hover:opacity-100 hidden md:block cursor-pointer"
                  title="Deslizar izquierda"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => scroll("right")}
                  className="absolute right-[-20px] top-1/2 -translate-y-1/2 p-2 rounded-full border border-white/10 bg-zinc-950/80 text-white hover:bg-zinc-800 transition-colors shadow-2xl opacity-0 group-hover:opacity-100 hidden md:block cursor-pointer"
                  title="Deslizar derecha"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

          </div>
        )}

      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  )
}
