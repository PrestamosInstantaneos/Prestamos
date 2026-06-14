"use client"

import useSWR from "swr"
import Image from "next/image"
import { Sparkles } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function getLevelGlowClass(level: number): string {
  switch (level) {
    case 1: // Caracol
      return "border-zinc-500/60 bg-zinc-900/50 shadow-[0_0_4px_rgba(161,161,170,0.15)]"
    case 2: // Iguana
      return "border-emerald-500/80 bg-emerald-950/20 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
    case 3: // Guacamaya
      return "border-cyan-400 bg-cyan-950/20 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
    case 4: // Cachicamo
      return "border-amber-600 bg-amber-950/20 shadow-[0_0_10px_rgba(217,119,6,0.5)]"
    case 5: // Chiguire
      return "border-purple-500 bg-purple-950/20 shadow-[0_0_12px_rgba(168,85,247,0.6)]"
    case 6: // Venado
      return "border-lime-400 bg-lime-950/20 shadow-[0_0_14px_rgba(163,230,53,0.7)]"
    case 7: // Aguila
      return "border-indigo-500 bg-indigo-950/20 shadow-[0_0_16px_rgba(99,102,241,0.8)]"
    case 8: // Caiman
      return "border-yellow-500 bg-yellow-950/20 shadow-[0_0_18px_rgba(234,179,8,0.9)] animate-pulse"
    case 9: // Jaguar
      return "border-red-500 bg-red-950/30 shadow-[0_0_22px_rgba(239,68,68,1)] animate-pulse border-[2.5px] scale-105"
    default:
      return "border-zinc-500/60"
  }
}

export function LevelsTicker() {
  const { data } = useSWR("/api/levels/ticker", fetcher, {
    refreshInterval: 60000, // Revalidar cada 1 minuto
    revalidateOnFocus: false,
  })

  const users = data?.users || []

  if (users.length === 0) {
    return null
  }

  // Duplicar el array de usuarios para permitir un scroll infinito y continuo
  const marqueeItems = [...users, ...users, ...users]

  return (
    <div className="w-full bg-zinc-950/80 border-b border-white/5 py-2.5 backdrop-blur-xl relative z-40 overflow-hidden select-none">
      <div className="flex flex-row items-center w-full">
        {/* Etiqueta flotante izquierda */}
        <div className="absolute left-0 top-0 bottom-0 px-4 bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-transparent z-50 flex items-center gap-1.5 shrink-0 text-[10px] font-extrabold tracking-widest text-primary uppercase border-r border-transparent">
          <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
          <span className="drop-shadow-md">Niveles Club:</span>
        </div>

        {/* Contenedor de la animación del Marquee */}
        <div className="w-full flex overflow-hidden">
          <div className="flex gap-8 items-center py-0.5 whitespace-nowrap animate-marquee">
            {marqueeItems.map((item: any, idx: number) => {
              const borderGlow = getLevelGlowClass(item.level)
              
              return (
                <div
                  key={idx}
                  className="inline-flex items-center gap-3 bg-white/5 border border-white/5 rounded-full pl-2 pr-4 py-1 hover:border-white/10 transition-colors"
                >
                  {/* Badge circular con glow */}
                  <div className={`relative w-8 h-8 rounded-full border flex items-center justify-center overflow-hidden shrink-0 ${borderGlow}`}>
                    <Image
                      src={item.badgeUrl || `/images/levels/caracol.png`}
                      alt={item.animalName}
                      width={24}
                      height={24}
                      className="object-contain"
                    />
                  </div>
                  
                  {/* Nombre y logro */}
                  <div className="text-[11px] font-medium flex items-center gap-1.5 text-zinc-100">
                    <span className="font-bold text-white">{item.name}</span>
                    <span className="text-zinc-400">es</span>
                    <span className={`font-semibold uppercase tracking-wider text-[10px] ${
                      item.level >= 8 ? "text-yellow-400" : item.level >= 6 ? "text-lime-400" : item.level >= 4 ? "text-amber-400" : "text-cyan-400"
                    }`}>
                      {item.animalName} (Nivel {item.level})
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Desvanecimiento lateral derecho */}
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-zinc-950 to-transparent z-10 pointer-events-none" />
      </div>

      <style jsx global>{`
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-33.3333%);
          }
        }
        .animate-marquee {
          animation: marquee 45s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}
