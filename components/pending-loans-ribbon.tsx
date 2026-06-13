"use client"

import useSWR from "swr"
import { useEffect, useState, useRef } from "react"
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function getFriendlyStatus(estado: string) {
  const est = estado.trim().toLowerCase();
  if (est === "pendiente") {
    return {
      label: "PENDIENTE POR APROBAR",
      bgColor: "bg-amber-500/15 border-amber-500/25 text-amber-400"
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
      bgColor: "bg-red-500/15 border-red-500/25 text-red-400 animate-pulse"
    };
  }
  return {
    label: estado.toUpperCase(),
    bgColor: "bg-blue-500/15 border-blue-500/25 text-blue-400"
  };
}

export function PendingLoansRibbon() {
  const [user, setUser] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeLoanIndex, setActiveLoanIndex] = useState(0)

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

  const { data } = useSWR(user ? "/api/my-loans" : null, fetcher, {
    refreshInterval: 15000, // Revalidar cada 15 segundos
  })

  const loans = data?.loans || []
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  if (!user || loans.length === 0) {
    return null
  }

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
    }
  }

  return (
    <div className="w-full bg-amber-500/10 border-y border-amber-500/20 py-3.5 backdrop-blur-md relative z-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-4">
        
        {/* Indicador animado de recordatorio */}
        <div className="flex items-center gap-2 text-amber-500 shrink-0 select-none">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline-block">Recordatorio:</span>
        </div>

        {/* Cinta deslizable */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 min-w-0 flex flex-row flex-nowrap gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory px-1 py-0.5 select-none"
        >
          {loans.map((loan: any, idx: number) => {
            const statusConfig = getFriendlyStatus(loan.estado);
            const isPorPagar = loan.estado.trim().toLowerCase() === "aprobado" || 
                               loan.estado.trim().toLowerCase() === "activo" || 
                               loan.estado.trim().toLowerCase() === "por pagar" ||
                               loan.estado.trim().toLowerCase() === "pendiente por pagar" ||
                               loan.estado.trim().toLowerCase() === "pendiente_por_pagar";

            return (
              <div 
                key={idx} 
                className="snap-center shrink-0 min-w-max flex flex-row items-center gap-2.5 bg-black/40 border border-white/5 rounded-full py-1.5 px-4 text-xs text-white"
              >
                <Calendar className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>
                  {isPorPagar ? "Tienes una deuda " : "Tienes una solicitud "}
                  <strong className={`${statusConfig.bgColor} uppercase text-[9px] tracking-wider border px-1.5 py-0.5 rounded font-mono font-bold mr-1`}>
                    {statusConfig.label}
                  </strong>{" "}
                  de <strong className="text-amber-300 font-semibold">{loan.monto}</strong> ({loan.modalidad}) {isPorPagar ? "vence" : "para"} el <strong className="underline decoration-amber-500/40">{loan.fechasPago}</strong>. Total a pagar: <strong className="text-emerald-400 font-semibold">{loan.totalPagar}</strong>.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveLoanIndex(idx)
                    setIsModalOpen(true)
                  }}
                  className="ml-2 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/30 text-amber-300 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0"
                >
                  Detalles
                </button>
              </div>
            );
          })}
        </div>

        {/* Controles de deslizamiento */}
        {loans.length > 1 && (
          <div className="flex gap-1.5 shrink-0">
            <button 
              onClick={() => scroll("left")}
              className="p-1 rounded-full border border-white/10 hover:bg-white/10 text-white transition-colors"
              title="Ver anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button 
              onClick={() => scroll("right")}
              className="p-1 rounded-full border border-white/10 hover:bg-white/10 text-white transition-colors"
              title="Ver siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

      </div>

      {/* Modal de Detalles de Pendientes */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-foreground">
            
            {/* Header del modal */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <h3 className="text-sm font-bold text-amber-500 font-heading uppercase tracking-wider">
                Detalle de Solicitud ({activeLoanIndex + 1} de {loans.length})
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-white/5 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Carrusel Deslizante */}
            <div className="overflow-hidden relative w-full mb-6">
              <div 
                className="flex transition-transform duration-300 ease-out"
                style={{ transform: `translateX(-${activeLoanIndex * 100}%)` }}
              >
                {loans.map((item: any, i: number) => {
                  const status = getFriendlyStatus(item.estado);
                  const isInstallments = item.modalidad.trim().toLowerCase() === "cuotas" || item.modalidad.trim().toLowerCase() === "cuota";
                  return (
                    <div key={i} className="w-full shrink-0 px-1 space-y-4">
                      {/* Estado */}
                      <div className="text-center py-2">
                        <span className={`${status.bgColor} text-[10px] tracking-[0.2em] font-extrabold border px-3 py-1.5 rounded-full inline-block font-mono`}>
                          {status.label}
                        </span>
                      </div>

                      {/* Detalles */}
                      <div className="rounded-xl border border-white/5 bg-white/5 p-4 space-y-3.5 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Monto Solicitado:</span>
                          <span className="font-semibold text-white text-base">{item.monto}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Modalidad:</span>
                          <span className="font-semibold text-white">{item.modalidad}</span>
                        </div>
                        {isInstallments && item.montoCuota && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Monto por Cuota:</span>
                            <span className="font-semibold text-white">{item.montoCuota} (2 cuotas)</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total a Pagar:</span>
                          <span className="font-heading font-extrabold text-emerald-400 text-lg">{item.totalPagar}</span>
                        </div>
                        <div className="flex flex-col gap-1 border-t border-white/5 pt-2.5 mt-1">
                          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Fechas de Pago:</span>
                          <span className="font-semibold text-white font-mono text-xs bg-black/25 px-2 py-1.5 rounded-md leading-relaxed select-all">
                            {item.fechasPago}
                          </span>
                        </div>
                        
                        <div className="pt-2.5 border-t border-white/5 space-y-2 text-xs">
                          {item.tasaBCV && (
                            <div className="flex justify-between text-[11px] text-muted-foreground">
                              <span>Tasa BCV del Día:</span>
                              <span className="font-mono text-slate-300">{item.tasaBCV}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-[11px] text-muted-foreground">
                            <span>Fecha de Solicitud:</span>
                            <span className="font-mono text-slate-300">{item.fechaRegistro}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Controles de Navegación del Carrusel */}
            <div className="flex items-center justify-between border-t border-white/5 pt-4">
              {loans.length > 1 ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={activeLoanIndex === 0}
                    onClick={() => setActiveLoanIndex((prev) => prev - 1)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-semibold text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Anterior
                  </button>
                  <button
                    type="button"
                    disabled={activeLoanIndex === loans.length - 1}
                    onClick={() => setActiveLoanIndex((prev) => prev + 1)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-semibold text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    Siguiente <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div />
              )}
              
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold uppercase tracking-widest text-black hover:opacity-90 transition-opacity"
              >
                Cerrar
              </button>
            </div>

            {/* Indicadores de página (Puntos) */}
            {loans.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-4">
                {loans.map((_: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setActiveLoanIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === activeLoanIndex ? "w-4 bg-amber-500" : "w-1.5 bg-white/20 hover:bg-white/45"
                    }`}
                  />
                ))}
              </div>
            )}

          </div>
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}

