"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import Image from "next/image"
import { X, CheckCircle2, Lock, Star, Sparkles } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export interface LevelItem {
  level: number
  animalName: string
  animal: string
  badgeUrl: string
  requirement: string
  requirementAmount: number
  benefits: string[]
}

const levelsData: LevelItem[] = [
  {
    level: 1,
    animalName: "Caracol",
    animal: "caracol",
    badgeUrl: "/images/levels/caracol.png",
    requirement: "Inicial ($0 USD)",
    requirementAmount: 0,
    benefits: [
      "Límite de préstamo inicial de hasta Bs. 2.500,00.",
      "Modalidad de pago único al vencimiento (Pago Contado).",
      "Acceso básico y soporte estándar en la plataforma."
    ]
  },
  {
    level: 2,
    animalName: "Iguana",
    animal: "iguana",
    badgeUrl: "/images/levels/iguana.png",
    requirement: "Haber pagado $50 USD",
    requirementAmount: 50,
    benefits: [
      "Límite de préstamo incrementado hasta Bs. 4.500,00.",
      "5% de descuento en la tasa de interés de tus solicitudes.",
      "Aprobación de solicitudes prioritaria."
    ]
  },
  {
    level: 3,
    animalName: "Guacamaya",
    animal: "guacamaya",
    badgeUrl: "/images/levels/guacamaya.png",
    requirement: "Haber pagado $100 USD",
    requirementAmount: 100,
    benefits: [
      "Límite de préstamo incrementado hasta Bs. 6.500,00.",
      "8% de descuento en la tasa de interés de tus solicitudes.",
      "Acceso prioritario a cupones y ofertas especiales de fin de semana."
    ]
  },
  {
    level: 4,
    animalName: "Cachicamo",
    animal: "cachicamo",
    badgeUrl: "/images/levels/cachicamo.png",
    requirement: "Haber pagado $150 USD",
    requirementAmount: 150,
    benefits: [
      "Límite de préstamo incrementado hasta Bs. 8.500,00.",
      "Desbloqueo de modalidad de pago en **Cuotas** (2 cuotas quincenales).",
      "8% de descuento continuo en tasas de interés."
    ]
  },
  {
    level: 5,
    animalName: "Chigüire",
    animal: "chiguire",
    badgeUrl: "/images/levels/chiguire.png",
    requirement: "Haber pagado $200 USD",
    requirementAmount: 200,
    benefits: [
      "Límite de préstamo incrementado hasta Bs. 11.000,00.",
      "10% de descuento en la tasa de interés de tus solicitudes.",
      "Canal de atención preferencial vía Telegram / WhatsApp VIP."
    ]
  },
  {
    level: 6,
    animalName: "Venado",
    animal: "venado",
    badgeUrl: "/images/levels/venado.png",
    requirement: "Haber pagado $250 USD",
    requirementAmount: 250,
    benefits: [
      "Límite de préstamo incrementado hasta Bs. 15.000,00.",
      "Pago flexible en cuotas y un 12% de descuento en intereses.",
      "Retiros procesados en menos de 10 minutos (Soporte prioritario)."
    ]
  },
  {
    level: 7,
    animalName: "Águila Arpía",
    animal: "aguila",
    badgeUrl: "/images/levels/aguila.png",
    requirement: "Haber pagado $300 USD",
    requirementAmount: 300,
    benefits: [
      "Límite de préstamo incrementado hasta Bs. 20.000,00.",
      "15% de descuento en la tasa de interés de tus solicitudes.",
      "Plazos de pago extendidos quincenales o mensuales."
    ]
  },
  {
    level: 8,
    animalName: "Caimán",
    animal: "caiman",
    badgeUrl: "/images/levels/caiman.png",
    requirement: "Haber pagado $350 USD",
    requirementAmount: 350,
    benefits: [
      "Límite de préstamo incrementado hasta Bs. 25.000,00.",
      "15% de descuento en tasas de interés.",
      "Período de gracia exclusivo de 3 días hábiles sin intereses de mora."
    ]
  },
  {
    level: 9,
    animalName: "Jaguar",
    animal: "jaguar",
    badgeUrl: "/images/levels/jaguar.png",
    requirement: "Haber pagado $400 USD",
    requirementAmount: 400,
    benefits: [
      "Límite VIP personalizado de hasta Bs. 40.000,00.",
      "20% de descuento en la tasa de interés de todos tus créditos.",
      "Modalidades de pago personalizables y cuotas adaptadas a tus ingresos.",
      "Exención de cobro de tasas administrativas de desembolso."
    ]
  }
]

export function getLevelGlowClass(level: number): string {
  switch (level) {
    case 1: // Caracol
      return "border-zinc-500/50 bg-zinc-950/40 shadow-[0_0_8px_rgba(161,161,170,0.15)]"
    case 2: // Iguana
      return "border-emerald-500/50 bg-emerald-950/10 shadow-[0_0_12px_rgba(16,185,129,0.35)]"
    case 3: // Guacamaya
      return "border-cyan-400/50 bg-cyan-950/10 shadow-[0_0_15px_rgba(34,211,238,0.45)]"
    case 4: // Cachicamo
      return "border-amber-600/50 bg-amber-950/10 shadow-[0_0_15px_rgba(217,119,6,0.45)]"
    case 5: // Chiguire
      return "border-purple-500/50 bg-purple-950/10 shadow-[0_0_18px_rgba(168,85,247,0.55)] animate-pulse"
    case 6: // Venado
      return "border-lime-400/60 bg-lime-950/15 shadow-[0_0_20px_rgba(163,230,53,0.65)]"
    case 7: // Aguila
      return "border-indigo-500/60 bg-indigo-950/15 shadow-[0_0_22px_rgba(99,102,241,0.75)]"
    case 8: // Caiman
      return "border-yellow-500/70 bg-yellow-950/15 shadow-[0_0_24px_rgba(234,179,8,0.85)] animate-pulse"
    case 9: // Jaguar
      return "border-red-500/90 bg-red-950/25 shadow-[0_0_30px_rgba(239,68,68,0.95)] animate-pulse border-[2px]"
    default:
      return "border-zinc-500/50"
  }
}

export function LevelsTicker() {
  const [selectedLevel, setSelectedLevel] = useState<LevelItem | null>(null)
  const [user, setUser] = useState<any | null>(null)

  // Cargar usuario del localStorage
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

  // Consultar el endpoint de préstamos para obtener el nivel actual del usuario logueado
  const { data: loansData } = useSWR(user ? "/api/my-loans" : null, fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 30000
  })

  const userLevel = loansData?.levelInfo?.level || 0
  const userTotalPaid = loansData?.levelInfo?.totalPaidUsd || 0

  // Duplicar el array de niveles estáticos para que el carrusel infinito sea fluido
  const marqueeItems = [...levelsData, ...levelsData, ...levelsData]

  return (
    <section className="w-full py-10 border-t border-border/40 bg-zinc-950/40 relative z-35 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 text-center mb-8">
        <p className="mb-2 text-xs font-semibold tracking-[0.3em] text-primary uppercase flex items-center justify-center gap-1.5 select-none">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          Club de Beneficios
        </p>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl select-none">
          Niveles de Socio y Recompensas
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto select-none">
          Haz clic en cualquier ficha de nivel para conocer qué necesitas para entrar y cuáles son sus descuentos y ventajas exclusivas.
        </p>
      </div>

      {/* Marquesina horizontal de fichas */}
      <div className="relative w-full flex items-center select-none py-4 overflow-hidden">
        {/* Desvanecimientos laterales */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-zinc-950 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-zinc-950 to-transparent z-10 pointer-events-none" />

        {/* Pista deslizable infinita */}
        <div className="w-full flex overflow-hidden">
          <div className="flex gap-6 items-center py-2 whitespace-nowrap animate-marquee-large">
            {marqueeItems.map((item, idx) => {
              const borderGlow = getLevelGlowClass(item.level)
              const isActive = user && userLevel >= item.level

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedLevel(item)}
                  className={`inline-flex flex-col items-center justify-between w-[150px] h-[210px] rounded-2xl border p-4 backdrop-blur-xl transition-all duration-300 hover:scale-105 active:scale-98 cursor-pointer relative shrink-0 ${borderGlow} group`}
                >
                  {/* Badge de nivel activo */}
                  {isActive && (
                    <div className="absolute top-2.5 right-2.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-full p-1 shadow-md" title="Nivel Desbloqueado">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                  )}

                  {/* Imagen del animal */}
                  <div className="relative w-20 h-20 flex items-center justify-center mt-2 group-hover:rotate-3 transition-transform duration-300">
                    <Image
                      src={item.badgeUrl}
                      alt={item.animalName}
                      width={75}
                      height={75}
                      className="object-contain"
                      priority={idx < 9}
                    />
                  </div>

                  {/* Texto identificador */}
                  <div className="text-center w-full mt-3">
                    <h4 className="text-sm font-extrabold text-white leading-tight font-heading">
                      {item.animalName}
                    </h4>
                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
                      Nivel {item.level}
                    </p>
                    <p className="text-[10px] text-primary font-semibold mt-1">
                      {item.requirementAmount === 0 ? "Inicial" : `$${item.requirementAmount} USD`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Modal descriptivo de beneficios */}
      {selectedLevel && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-250 text-foreground">
            
            {/* Botón de cerrar */}
            <button
              type="button"
              onClick={() => setSelectedLevel(null)}
              className="absolute top-4 right-4 rounded-full p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Encabezado visual del nivel */}
            <div className="text-center space-y-3.5 mt-2">
              <div className={`mx-auto w-24 h-24 rounded-full border flex items-center justify-center overflow-hidden ${getLevelGlowClass(selectedLevel.level)}`}>
                <Image
                  src={selectedLevel.badgeUrl}
                  alt={selectedLevel.animalName}
                  width={80}
                  height={80}
                  className="object-contain"
                />
              </div>

              <div>
                <span className="text-[10px] font-extrabold text-primary uppercase tracking-[0.25em]">
                  Detalles del Rango
                </span>
                <h3 className="font-heading text-xl font-extrabold text-white mt-1">
                  Nivel {selectedLevel.level}: {selectedLevel.animalName}
                </h3>
              </div>

              {/* Indicador de progreso/estatus */}
              <div className="inline-block">
                {!user ? (
                  <span className="text-[10px] font-semibold text-zinc-400 bg-white/5 border border-white/10 px-3 py-1 rounded-full uppercase tracking-wider">
                    Inicia sesión para ver tu progreso
                  </span>
                ) : userLevel >= selectedLevel.level ? (
                  <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Nivel Desbloqueado
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full uppercase tracking-wider">
                    Te falta pagar ${(selectedLevel.requirementAmount - userTotalPaid).toFixed(2)} USD
                  </span>
                )}
              </div>
            </div>

            {/* Lista de beneficios */}
            <div className="my-6 space-y-4 pt-4 border-t border-white/5">
              <h5 className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block text-left">
                Requisitos y Recompensas:
              </h5>
              
              {/* Caja de Requisito */}
              <div className="rounded-xl border border-white/5 bg-white/5 p-3 flex items-center gap-3">
                <Lock className="h-4.5 w-4.5 text-primary shrink-0" />
                <div className="text-xs text-left">
                  <span className="font-bold text-white block">Requisito de Acceso:</span>
                  <span className="text-slate-300">
                    {selectedLevel.level === 1 
                      ? "Rango inicial disponible para nuevos usuarios." 
                      : `Haber pagado un volumen acumulado de $${selectedLevel.requirementAmount} USD en la plataforma.`}
                  </span>
                </div>
              </div>

              {/* Caja de Beneficios */}
              <div className="space-y-2.5">
                {selectedLevel.benefits.map((benefit, idx) => (
                  <div key={idx} className="flex gap-2.5 items-start text-xs text-left">
                    <Star className="h-4 w-4 text-amber-400 shrink-0 mt-0.5 fill-amber-400/20" />
                    <span className="text-slate-200 font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: benefit }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Acción de cierre */}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setSelectedLevel(null)}
                className="w-full rounded-xl bg-primary py-3 text-xs font-bold uppercase tracking-widest text-black hover:opacity-90 transition-opacity cursor-pointer shadow-lg"
              >
                Entendido
              </button>
            </div>

          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes marquee-large {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-33.3333%);
          }
        }
        .animate-marquee-large {
          animation: marquee-large 50s linear infinite;
        }
        .animate-marquee-large:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  )
}
