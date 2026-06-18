"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { 
  Calculator, 
  UserCheck, 
  MessageSquare, 
  CreditCard, 
  Award, 
  ChevronLeft, 
  ChevronRight, 
  HelpCircle, 
  Sparkles
} from "lucide-react"

type BcvRate = {
  usd: number
  fetchedAt: string
  source: "bcv" | "fallback"
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface RoadmapStep {
  number: number
  title: string
  icon: any
  animalName: string
  animalBadge: string
  glowClass: string
  stories: {
    contado: string
    cuotas: string
    otro: string
  }
  details: {
    contado: string
    cuotas: string
    otro: string
  }
  tips: {
    label: string
    content: string
  }[]
}

const roadmapSteps: RoadmapStep[] = [
  {
    number: 1,
    title: "Simula tu Préstamo",
    icon: Calculator,
    animalName: "Caracol 🐌",
    animalBadge: "/images/levels/caracol.png",
    glowClass: "border-orange-500/50 bg-orange-950/20 shadow-[0_0_15px_rgba(249,115,22,0.45)] text-orange-400",
    stories: {
      contado: "Miguel necesita reparar su moto para trabajar. Elige en la simulación 'Pago al Contado' por Bs. 4.000, fijando una fecha de pago único a 7 días para ahorrar en intereses.",
      cuotas: "Miguel necesita pagar un gasto médico imprevisto. Simula su préstamo en modalidad '2 Cuotas' por Bs. 5.000 para pagarlo en sus días de cobro quincenal.",
      otro: "Miguel requiere Bs. 15.000 (monto mayor al límite inicial). Selecciona 'Otro Monto' para recibir una evaluación crediticia personalizada directamente por un operador."
    },
    details: {
      contado: "Simulando al instante, Miguel conoce los plazos y el costo exacto antes de comprometerse.",
      cuotas: "Dividir el pago en dos cuotas quincenales le permite cumplir con total tranquilidad.",
      otro: "La opción especial es ideal para emergencias mayores que superan su límite básico."
    },
    tips: [
      {
        label: "¿Por qué simular?",
        content: "Para ajustar tu pago a tu presupuesto y ver cuánto ahorrarás antes de registrarte."
      },
      {
        label: "Pronto Pago",
        content: "Elige fechas de pago menores o iguales a 7 días y obtendrás 15% de descuento en la tasa de interés."
      }
    ]
  },
  {
    number: 2,
    title: "¡REGÍSTRATE PRIMERO!",
    icon: UserCheck,
    animalName: "Guacamaya 🦜",
    animalBadge: "/images/levels/guacamaya.png",
    glowClass: "border-cyan-500/50 bg-cyan-950/20 shadow-[0_0_15px_rgba(6,182,212,0.5)] text-cyan-400 animate-pulse",
    stories: {
      contado: "¡Paso indispensable! Miguel debe registrarse primero. Rellena sus datos, sube una foto legible de su cédula y una selfie clara de su rostro en segundos.",
      cuotas: "¡Paso indispensable! Para procesar su préstamo en cuotas, Miguel debe crear su perfil de usuario con sus datos personales, cédula y una selfie frontal rápida.",
      otro: "¡Paso indispensable! Para montos grandes, Miguel debe registrarse primero para que el operador verifique su identidad y pueda aprobar su solicitud."
    },
    details: {
      contado: "El registro es rápido, gratis y obligatorio antes de que puedas transferirte el dinero.",
      cuotas: "Tus datos se resguardan de forma encriptada bajo estrictos estándares de seguridad bancaria.",
      otro: "Tener tu perfil verificado le permite al operador validar tu nivel de confianza al instante."
    },
    tips: [
      {
        label: "Foto de la Cédula",
        content: "Asegúrate de que la foto de tu cédula esté bien enfocada, legible y sin reflejos de luz directos."
      },
      {
        label: "Selfie Clara",
        content: "Tómate la selfie con buena luz, de frente y con la cara descubierta (sin gorras ni lentes)."
      }
    ]
  },
  {
    number: 3,
    title: "Contacto por WhatsApp",
    icon: MessageSquare,
    animalName: "Delfín 🐬",
    animalBadge: "/images/levels/delfin.png",
    glowClass: "border-emerald-500/50 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.45)] text-emerald-400",
    stories: {
      contado: "Un operador oficial de RESUELVE YA! revisa la cuenta de Miguel y le escribe a su WhatsApp. Confirma su teléfono y los datos del Pago Móvil.",
      cuotas: "El operador contacta a Miguel por WhatsApp para coordinar el cronograma y verificar la titularidad de su cuenta bancaria de recepción.",
      otro: "Miguel es enlazado de inmediato con soporte vía WhatsApp. El operador evalúa sus necesidades especiales y aprueba un monto superior."
    },
    details: {
      contado: "Validar por WhatsApp garantiza que el pago móvil se haga a la persona correcta.",
      cuotas: "Se verifica el Pago Móvil del mismo titular para proteger la cuenta contra suplantación.",
      otro: "Un trato directo y humano permite acordar planes cómodos para montos mayores."
    },
    tips: [
      {
        label: "Cuentas Propias",
        content: "El Pago Móvil registrado debe pertenecer a la misma persona titular de la cédula por seguridad."
      },
      {
        label: "Soporte Oficial",
        content: "Solo te contactaremos por nuestros canales oficiales verificados. Nunca te pediremos contraseñas."
      }
    ]
  },
  {
    number: 4,
    title: "Desembolso Pago Móvil",
    icon: CreditCard,
    animalName: "Chigüire 🦫",
    animalBadge: "/images/levels/chiguire.png",
    glowClass: "border-purple-500/50 bg-purple-950/20 shadow-[0_0_15px_rgba(168,85,247,0.45)] text-purple-400",
    stories: {
      contado: "¡Aprobado! El operador aprueba la solicitud y transfiere los Bolívares al Pago Móvil de Miguel en minutos de forma transparente.",
      cuotas: "¡Aprobado! Miguel recibe el desembolso total de su préstamo de inmediato mediante Pago Móvil a su banco.",
      otro: "¡Aprobado! El operador autoriza el monto excepcional pactado y Miguel recibe sus Bolívares al instante."
    },
    details: {
      contado: "El dinero se transfiere de inmediato, limpio de cargos o tarifas fantasmas.",
      cuotas: "Recibes el 100% de los fondos el primer día y abonas a tus plazos cómodamente.",
      otro: "Miguel logra solventar su emergencia de mayor envergadura gracias al monto especial."
    },
    tips: [
      {
        label: "Sin Adelantos",
        content: "RESUELVE YA! nunca te pedirá dinero por adelantado, comisiones previas o depósitos iniciales para prestarte."
      },
      {
        label: "Tiempo de Entrega",
        content: "Una vez verificado el Pago Móvil, el dinero se envía de inmediato y se acredita en pocos minutos."
      }
    ]
  },
  {
    number: 5,
    title: "Pago y Nivel Iguana",
    icon: Award,
    animalName: "Iguana 🦎",
    animalBadge: "/images/levels/iguana.png",
    glowClass: "border-yellow-500/50 bg-yellow-950/20 shadow-[0_0_15px_rgba(234,179,8,0.5)] text-yellow-400 animate-pulse",
    stories: {
      contado: "Miguel realiza su pago a tiempo vía Pago Móvil. Al pagar puntual, su cuenta sube al Nivel 2 (Iguana), incrementando su límite automático a Bs. 9.000.",
      cuotas: "Miguel paga sus dos cuotas en los plazos fijados. Al cancelar exitosamente, sube al nivel Iguana y desbloquea mayores montos.",
      otro: "Miguel cancela su préstamo especial de acuerdo al plan acordado. Sube de nivel y gana una línea de crédito mayor para el futuro."
    },
    details: {
      contado: "Pagar a tiempo es la llave para subir niveles y obtener préstamos de hasta Bs. 50.000.",
      cuotas: "El comportamiento de pago en cuotas consolida tu perfil crediticio de forma automática.",
      otro: "El cumplimiento de montos personalizados te convierte en un cliente preferente del sistema."
    },
    tips: [
      {
        label: "Beneficios de Subir",
        content: "Al subir al nivel Iguana obtienes más límite de préstamo y descuentos permanentes en tasas de interés."
      },
      {
        label: "Reportar Pago",
        content: "Reporta tu pago móvil de forma rápida desde tu panel de usuario para que se valide al instante."
      }
    ]
  }
]

export function HowToRequestFlow() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [modality, setModality] = useState<"contado" | "cuotas" | "otro">("contado")
  const [activeStep, setActiveStep] = useState(1)
  const [openTipIdx, setOpenTipIdx] = useState<number | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  // Estados del simulador interactivo
  const [simAmount, setSimAmount] = useState(2000)
  const [simDays, setSimDays] = useState(7)
  const [customAmountText, setCustomAmountText] = useState("15000")

  useEffect(() => {
    function handleOpenEvent() {
      setIsOpen(true)
      setTimeout(() => {
        const el = document.getElementById("como-solicitar")
        if (el) {
          el.scrollIntoView({ behavior: "smooth" })
        }
      }, 100)
    }
    window.addEventListener("open-roadmap", handleOpenEvent)
    return () => {
      window.removeEventListener("open-roadmap", handleOpenEvent)
    }
  }, [])

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

  // Obtener tasa del dólar BCV
  const { data: rate } = useSWR<BcvRate>("/api/bcv-rate", fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 1000 * 60 * 60,
  })
  const bcvUsd = rate?.usd && rate.usd > 0 ? rate.usd : 602.0

  // Desplazar Miguel a paso 1 al cambiar de modalidad
  useEffect(() => {
    setActiveStep(1)
    setOpenTipIdx(null)
  }, [modality])

  if (user) return null

  if (!isOpen) {
    return (
      <section id="como-solicitar" className="py-16 px-4 sm:px-6 lg:px-10 border-t border-border bg-background text-center relative overflow-hidden select-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] pointer-events-none bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.03),transparent_65%)]" />
        <div className="mx-auto max-w-xl relative z-10 flex flex-col items-center gap-4">
          <p className="text-[10px] sm:text-xs font-black tracking-[0.3em] text-primary uppercase">
            Guía Interactiva
          </p>
          <h2 className="font-heading text-xl font-extrabold text-white sm:text-2xl leading-snug">
            ¿Quieres ver paso a paso cómo solicitar tu préstamo? 🎒
          </h2>
          <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
            Conoce "El Viaje de Miguel" y simula tu pago en vivo de forma sencilla antes de enviar tu registro.
          </p>
          <button
            onClick={() => setIsOpen(true)}
            className="rounded-xl bg-primary px-6 py-3.5 text-xs font-bold tracking-widest text-primary-foreground hover:scale-[1.02] active:scale-98 transition-all shadow-lg shadow-primary/20 uppercase cursor-pointer flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Ver cómo funciona a detalle
          </button>
        </div>
      </section>
    )
  }

  // Cálculos de simulación en vivo
  const simulationResults = useMemo(() => {
    if (modality === "otro") {
      const parsed = parseFloat(customAmountText.replace(/\D/g, "")) || 0
      return {
        amountBs: parsed,
        amountUsd: parsed / bcvUsd,
        interestUsd: 0,
        totalUsd: 0,
        totalBs: 0,
        hasDiscount: false,
        installmentBs: 0,
        installmentUsd: 0
      }
    }

    const amountBs = simAmount
    const amountUsd = amountBs / bcvUsd
    const interestUsdBase = (amountBs / 1000) * 0.8
    
    let hasDiscount = false
    let interestUsd = interestUsdBase

    if (modality === "contado" && simDays <= 7) {
      hasDiscount = true
      interestUsd = interestUsdBase * 0.85
    }

    const totalUsd = amountUsd + interestUsd
    const totalBs = totalUsd * bcvUsd

    return {
      amountBs,
      amountUsd,
      interestUsd,
      totalUsd,
      totalBs,
      hasDiscount,
      installmentBs: totalBs / 2,
      installmentUsd: totalUsd / 2,
      originalInterestUsd: interestUsdBase,
      originalTotalBs: (amountUsd + interestUsdBase) * bcvUsd
    }
  }, [simAmount, simDays, customAmountText, modality, bcvUsd])

  // Colores dinámicos para la ficha basados en el paso activo
  const activeColor = useMemo(() => {
    switch (activeStep) {
      case 1: return "#f97316" // Orange
      case 2: return "#06b6d4" // Cyan
      case 3: return "#10b981" // Emerald
      case 4: return "#a855f7" // Purple
      case 5: return "#eab308" // Yellow/Gold
      default: return "#3b82f6"
    }
  }, [activeStep])

  const cardBorderAndGlow = useMemo(() => {
    switch (activeStep) {
      case 1: return "border-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.15)] bg-orange-950/[0.01]"
      case 2: return "border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] bg-cyan-950/[0.01]"
      case 3: return "border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)] bg-emerald-950/[0.01]"
      case 4: return "border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.15)] bg-purple-950/[0.01]"
      case 5: return "border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.2)] bg-yellow-950/[0.01]"
      default: return "border-white/10"
    }
  }, [activeStep])

  const currentStepData = roadmapSteps[activeStep - 1]

  const formatBs = (val: number) => {
    return new Intl.NumberFormat("es-VE", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(val)
  }

  const formatUsd = (val: number) => {
    return new Intl.NumberFormat("es-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(val)
  }

  return (
    <section id="como-solicitar" className="relative py-20 px-4 sm:px-6 lg:px-10 border-t border-border overflow-hidden bg-background">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] pointer-events-none bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.03),transparent_65%)] animate-pulse" />

      <div className="mx-auto max-w-4xl relative z-10">
        
        {/* TITLE */}
        <div className="text-center mb-8">
          <p className="mb-2 text-[10px] sm:text-xs font-black tracking-[0.3em] text-primary uppercase select-none">
            Historia Interactiva
          </p>
          <h2 className="font-heading text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            El Viaje de Miguel 🎒
          </h2>
        </div>

        {/* MODALITY SELECTOR TABS */}
        <div className="flex justify-center mb-8 select-none">
          <div className="flex p-1 rounded-xl border border-white/10 bg-zinc-950/60 backdrop-blur-md shadow-2xl max-w-md w-full">
            {(["contado", "cuotas", "otro"] as const).map((mode) => {
              const active = modality === mode
              let activeColorClass = "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
              if (mode === "cuotas") activeColorClass = "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20"
              if (mode === "otro") activeColorClass = "bg-pink-500 text-white shadow-lg shadow-pink-500/20"

              return (
                <button
                  key={mode}
                  onClick={() => {
                    setModality(mode)
                  }}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-extrabold tracking-wider transition-all duration-300 uppercase ${
                    active 
                      ? activeColorClass 
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {mode === "contado" ? "Al Contado" : mode === "cuotas" ? "2 Cuotas" : "Otro Monto"}
                </button>
              )
            })}
          </div>
        </div>

        {/* NARRATIVE DETAIL PANEL (WITH INTEGRATED STEPPER) */}
        <div className={`w-full rounded-3xl border p-6 sm:p-8 shadow-2xl relative transition-all duration-500 overflow-hidden bg-zinc-950/90 backdrop-blur-lg ${cardBorderAndGlow}`}>
          
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

          {/* INTEGRATED STEPPER (REPLACES THE OLD 330PX SVG ROAD) */}
          <div className="relative w-full h-16 flex items-center justify-between px-2 sm:px-6 mb-12 select-none">
            {/* The Road dashed line connector */}
            <div className="absolute left-6 right-6 h-[3px] bg-zinc-900 border-y border-zinc-800 rounded-full" />
            
            {/* Active road line */}
            <div 
              className="absolute left-6 h-[3px] transition-all duration-500 ease-in-out rounded-full" 
              style={{
                width: `calc(${(activeStep - 1) * 25}% - ${(activeStep - 1) * 3}px)`,
                background: activeColor,
                boxShadow: `0 0 10px ${activeColor}`
              }}
            />

            {/* Miguel Riding Motorbike */}
            <div
              className="absolute z-20 pointer-events-none transition-all duration-500 ease-in-out"
              style={{
                left: `calc(1.375rem + ${(activeStep - 1) * 25}% - ${(activeStep - 1) * 11}px)`,
                transform: "translate(-50%, -24px)"
              }}
            >
              <div className="flex flex-col items-center">
                <span className="bg-primary text-primary-foreground text-[7px] font-black px-1.5 py-0.5 rounded shadow border border-primary/20 animate-bounce uppercase font-sans tracking-wide">
                  MIGUEL 🏍️
                </span>
              </div>
            </div>

            {/* Step Bubbles */}
            {roadmapSteps.map((step) => {
              const isSelected = activeStep === step.number
              
              let glowStyle = step.glowClass
              if (isSelected) {
                if (step.number === 1) glowStyle = "border-orange-500 bg-orange-950/40 shadow-[0_0_15px_rgba(249,115,22,0.8)] scale-110 ring-4 ring-orange-500/10 text-orange-400"
                if (step.number === 2) glowStyle = "border-cyan-400 bg-cyan-950/40 shadow-[0_0_15px_rgba(34,211,238,0.8)] scale-110 ring-4 ring-cyan-500/10 text-cyan-400"
                if (step.number === 3) glowStyle = "border-emerald-400 bg-emerald-950/30 shadow-[0_0_15px_rgba(16,185,129,0.8)] scale-110 ring-4 ring-emerald-500/10 text-emerald-400"
                if (step.number === 4) glowStyle = "border-purple-400 bg-purple-950/30 shadow-[0_0_15px_rgba(168,85,247,0.8)] scale-110 ring-4 ring-purple-500/10 text-purple-400"
                if (step.number === 5) glowStyle = "border-yellow-400 bg-yellow-950/30 shadow-[0_0_15px_rgba(234,179,8,0.8)] scale-110 ring-4 ring-yellow-500/10 text-yellow-400 animate-pulse"
              } else {
                glowStyle = "bg-zinc-900 border-white/5 text-zinc-500 opacity-60 hover:opacity-100 hover:scale-105"
              }

              const StepIcon = step.icon

              return (
                <button
                  key={step.number}
                  onClick={() => {
                    setActiveStep(step.number)
                    setOpenTipIdx(null)
                  }}
                  className={`relative z-10 h-11 w-11 rounded-full border flex items-center justify-center transition-all duration-300 ${glowStyle}`}
                >
                  <StepIcon className="h-4.5 w-4.5 relative z-10" />
                  
                  {/* Floating badge for registration alert */}
                  {step.number === 2 && (
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[7px] font-black px-1 py-0.5 rounded shadow border border-red-400 uppercase tracking-widest whitespace-nowrap animate-pulse">
                      ¡REGÍSTRATE!
                    </span>
                  )}

                  <span className="absolute -bottom-1 -right-1 bg-zinc-950 text-[8px] font-black h-4 w-4 rounded-full flex items-center justify-center text-white border border-white/10">
                    {step.number}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mt-4">
            
            {/* Miguel Character Avatar Graphic */}
            <div className="relative shrink-0 flex flex-col items-center">
              <div className="h-24 w-24 rounded-full overflow-hidden border border-white/10 bg-zinc-900/80 flex items-center justify-center p-2 shadow-inner relative group">
                <img
                  src="/images/rostro-ejemplo.png"
                  alt="Avatar Miguel"
                  className="h-full w-full object-cover rounded-full group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute -bottom-1 -right-1 bg-zinc-950 border border-white/10 text-xs h-7 w-7 rounded-full flex items-center justify-center shadow-lg">
                  {activeStep === 1 ? "🐌" : activeStep === 2 ? "🦜" : activeStep === 3 ? "🐬" : activeStep === 4 ? "🦫" : "🦎"}
                </div>
              </div>
              <span className="mt-2.5 text-[11px] font-black text-white tracking-wider">
                MIGUEL
              </span>
              <span className="text-[9px] font-bold text-primary tracking-widest uppercase mt-0.5">
                {activeStep === 5 ? "Nivel Iguana 🦎" : "Nivel Caracol 🐌"}
              </span>
            </div>

            {/* Narrative Context */}
            <div className="flex-1 w-full text-center md:text-left">
              <h3 className="font-heading text-base sm:text-xl font-black text-white mb-2 flex items-center justify-center md:justify-start gap-2.5">
                <span className="font-mono text-zinc-500 font-bold">Paso {activeStep}:</span>
                {currentStepData.title}
              </h3>
              
              <p className="text-xs leading-relaxed text-zinc-300 mb-4 font-medium">
                {currentStepData.stories[modality]}
              </p>

              {/* LIVE SIMULATOR FOR PASO 1 */}
              {activeStep === 1 && (
                <div className="my-5 p-4 rounded-2xl border border-white/5 bg-zinc-950/60 shadow-inner space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                      Simula tu préstamo aquí mismo
                    </h4>
                    <span className="text-[9px] text-zinc-500 font-mono">
                      Tasa BCV: Bs. {formatBs(bcvUsd)}
                    </span>
                  </div>

                  {modality === "otro" ? (
                    <div className="space-y-2.5">
                      <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">
                        Escribe el monto que necesitas
                      </label>
                      <div className="flex gap-2">
                        <span className="bg-zinc-900 border border-white/10 px-3.5 py-2.5 text-xs font-extrabold rounded-xl text-zinc-400 flex items-center">
                          Bs.
                        </span>
                        <input
                          type="text"
                          value={customAmountText}
                          onChange={(e) => setCustomAmountText(e.target.value.replace(/\D/g, ""))}
                          placeholder="Ej. 15000"
                          className="flex-1 bg-zinc-900 border border-white/10 px-4 py-2.5 text-xs font-extrabold rounded-xl text-white outline-none focus:border-primary/50 font-mono"
                        />
                      </div>
                      <p className="text-[10px] leading-relaxed text-zinc-400">
                        💡 Este monto supera el límite inicial de Bs. 6.000, por lo que requerirá una entrevista corta vía WhatsApp con nuestro operador para habilitar tu perfil.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Slider de Monto */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px] font-bold text-zinc-300">
                          <span>¿Cuánto dinero necesitas?</span>
                          <span className="text-primary font-mono font-black text-xs">
                            Bs. {formatBs(simAmount)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1000"
                          max="6000"
                          step="100"
                          value={simAmount}
                          onChange={(e) => setSimAmount(Number(e.target.value))}
                          className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-[8px] font-mono text-zinc-500">
                          <span>Bs. 1.000</span>
                          <span>Bs. 6.000</span>
                        </div>
                      </div>

                      {/* Plazo para Contado */}
                      {modality === "contado" && (
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">
                            ¿En cuántos días pagarás?
                          </span>
                          <div className="flex gap-2">
                            {[7, 15, 30].map((days) => (
                              <button
                                key={days}
                                onClick={() => setSimDays(days)}
                                className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${
                                  simDays === days
                                    ? "bg-primary border-primary text-primary-foreground font-extrabold"
                                    : "bg-zinc-900 border-white/10 text-zinc-400 hover:text-white"
                                }`}
                              >
                                {days} Días {days === 7 && "🔥 15% Desc"}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Detalles en Cuotas */}
                      {modality === "cuotas" && (
                        <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
                          <div className="text-[10px]">
                            <span className="font-bold text-zinc-300 block">Modalidad 2 Cuotas:</span>
                            <span className="text-zinc-400">Pagas el 50% de la cuota cada 15 días (quincenal).</span>
                          </div>
                          <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[8px] font-black tracking-widest px-2 py-0.5 rounded uppercase">
                            Predefinido
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Resumen del Simulador */}
                  <div className="bg-zinc-900/80 p-3.5 rounded-xl border border-white/5 space-y-2 text-[11px] text-zinc-300">
                    <div className="flex justify-between font-mono">
                      <span>Monto solicitado</span>
                      <span className="font-bold text-white">Bs. {formatBs(simulationResults.amountBs)}</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span>Equivalente en USD</span>
                      <span className="font-bold text-white">{formatUsd(simulationResults.amountUsd)}</span>
                    </div>

                    {modality !== "otro" && (
                      <>
                        <div className="flex justify-between items-center font-mono border-t border-white/5 pt-1.5">
                          <span>Interés de Tasa</span>
                          <div className="text-right">
                            {simulationResults.hasDiscount ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9.5px] line-through text-zinc-500 font-mono">
                                  {formatUsd(simulationResults.originalInterestUsd || 0)}
                                </span>
                                <span className="font-bold text-emerald-400">
                                  {formatUsd(simulationResults.interestUsd)}
                                </span>
                              </div>
                            ) : (
                              <span className="font-bold text-white">
                                {formatUsd(simulationResults.interestUsd)}
                              </span>
                            )}
                          </div>
                        </div>

                        {modality === "cuotas" ? (
                          <div className="flex justify-between items-center border-t border-white/5 pt-2 bg-cyan-950/10 p-2 rounded-lg border border-cyan-500/10">
                            <span className="font-bold text-cyan-400 uppercase text-[9px] tracking-wider">Abono por Cuota</span>
                            <div className="text-right">
                              <span className="block font-black text-cyan-300 text-xs font-mono">
                                Bs. {formatBs(simulationResults.installmentBs)}
                              </span>
                              <span className="text-[8.5px] text-zinc-400 block font-mono">
                                ({formatUsd(simulationResults.installmentUsd)} USD)
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center border-t border-white/5 pt-2 bg-primary/5 p-2 rounded-lg border border-primary/10">
                            <span className="font-bold text-primary uppercase text-[9px] tracking-wider">Total a Pagar</span>
                            <div className="text-right">
                              {simulationResults.hasDiscount ? (
                                <div className="flex flex-col items-end">
                                  <span className="text-[9px] line-through text-zinc-500 font-mono">
                                    Bs. {formatBs(simulationResults.originalTotalBs || 0)}
                                  </span>
                                  <span className="font-black text-emerald-400 text-xs font-mono">
                                    Bs. {formatBs(simulationResults.totalBs)}
                                  </span>
                                </div>
                              ) : (
                                <span className="font-black text-white text-xs font-mono">
                                  Bs. {formatBs(simulationResults.totalBs)}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Alerta de Descuento */}
                    {simulationResults.hasDiscount && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold p-2 rounded-lg text-center flex items-center justify-center gap-1">
                        <Sparkles className="h-3 w-3 animate-pulse" />
                        ¡15% Descuento Pronto Pago aplicado!
                      </div>
                    )}
                  </div>
                </div>
              )}

              <p className="text-[11px] leading-relaxed text-primary/80 font-medium italic border-l-2 border-primary/40 pl-3 mb-6 text-left">
                {currentStepData.details[modality]}
              </p>

              {/* Floating Tips */}
              <div className="space-y-2.5">
                <label className="text-[9px] font-bold tracking-wider text-zinc-400 uppercase text-left block select-none">
                  Consejos prácticos del paso:
                </label>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start select-none">
                  {currentStepData.tips.map((tip, idx) => {
                    const isTipOpen = openTipIdx === idx
                    return (
                      <div key={idx} className="relative">
                        <button
                          onClick={() => setOpenTipIdx(isTipOpen ? null : idx)}
                          className={`rounded-lg px-3 py-2 text-[10px] font-extrabold flex items-center gap-1.5 transition-all ${
                            isTipOpen
                              ? "bg-primary text-primary-foreground shadow-lg"
                              : "bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10"
                          }`}
                        >
                          <HelpCircle className="h-3 w-3" />
                          {tip.label}
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* Display Opened Floating Tip Detail */}
                {openTipIdx !== null && (
                  <div className="mt-3.5 p-3 rounded-xl border border-white/5 bg-zinc-900/60 text-[11px] text-zinc-300 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200 text-left">
                    <strong className="font-bold text-primary block mb-1">
                      💡 {currentStepData.tips[openTipIdx].label}:
                    </strong>
                    {currentStepData.tips[openTipIdx].content}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Navigation Steppers Footer */}
          <div className="flex justify-between items-center mt-8 pt-4 border-t border-white/5 select-none">
            <button
              onClick={() => {
                setActiveStep((prev) => (prev > 1 ? prev - 1 : 5))
                setOpenTipIdx(null)
              }}
              className="text-[11px] font-bold text-zinc-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Atrás
            </button>

            <span className="text-[10px] font-mono font-bold tracking-wider text-zinc-500">
              Paso {activeStep} / 5
            </span>

            <button
              onClick={() => {
                setActiveStep((prev) => (prev < 5 ? prev + 1 : 1))
                setOpenTipIdx(null)
              }}
              className="text-[11px] font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1 cursor-pointer"
            >
              Siguiente <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

        </div>

        <button
          onClick={() => {
            setIsOpen(false)
            setTimeout(() => {
              const el = document.getElementById("como-solicitar")
              if (el) el.scrollIntoView({ behavior: "smooth" })
            }, 50)
          }}
          className="text-[10px] font-black text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-wider block mx-auto mt-6"
        >
          ▲ Ocultar Detalles del Proceso
        </button>

      </div>
    </section>
  )
}
