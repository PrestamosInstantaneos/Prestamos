"use client"

import useSWR from "swr"
import { useEffect, useState, useRef } from "react"
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function PendingLoansRibbon() {
  const [user, setUser] = useState<any | null>(null)

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
          className="flex-1 flex gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory px-1 py-0.5 select-none"
        >
          {loans.map((loan: any, idx: number) => (
            <div 
              key={idx} 
              className="snap-center shrink-0 flex items-center gap-2.5 bg-black/40 border border-white/5 rounded-full py-1.5 px-4 text-xs text-white max-w-full"
            >
              <Calendar className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="whitespace-nowrap">
                Tienes una solicitud <strong className="text-amber-400 uppercase text-[9px] tracking-wider bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 rounded font-mono font-bold mr-1">{loan.estado}</strong> de <strong className="text-amber-300 font-semibold">{loan.monto}</strong> ({loan.modalidad}) para el <strong className="underline decoration-amber-500/40">{loan.fechasPago}</strong>. Total a pagar: <strong className="text-emerald-400 font-semibold">{loan.totalPagar}</strong>.
              </span>
            </div>
          ))}
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
