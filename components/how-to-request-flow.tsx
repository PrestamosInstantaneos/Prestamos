"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
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
  Sparkles, 
  Info,
  CheckCircle2,
  Lock,
  ArrowRight
} from "lucide-react"

type BcvRate = {
  usd: number
  fetchedAt: string
  source: "bcv" | "fallback"
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface Coords {
  x: number
  y: number
}

const stepCoordinates: Record<"contado" | "cuotas" | "otro", Coords[]> = {
  contado: [
    { x: 100, y: 70 },
    { x: 300, y: 250 },
    { x: 500, y: 70 },
    { x: 700, y: 250 },
    { x: 900, y: 70 }
  ],
  cuotas: [
    { x: 110, y: 230 },
    { x: 300, y: 95 },
    { x: 500, y: 230 },
    { x: 700, y: 95 },
    { x: 900, y: 230 }
  ],
  otro: [
    { x: 100, y: 190 },
    { x: 300, y: 150 },
    { x: 500, y: 190 },
    { x: 700, y: 110 },
    { x: 900, y: 60 }
  ]
}

const roadPaths: Record<"contado" | "cuotas" | "otro", string> = {
  contado: "M 0 160 C 80 40, 120 40, 200 160 C 280 280, 320 280, 400 160 C 480 40, 520 40, 600 160 C 680 280, 720 280, 800 160 C 880 40, 920 40, 1000 160",
  cuotas: "M 0 120 C 100 260, 150 260, 220 160 C 280 60, 320 60, 380 160 C 450 260, 550 260, 620 160 C 680 60, 720 60, 780 160 C 850 260, 950 260, 1000 160",
  otro: "M 0 220 C 80 220, 120 140, 200 140 C 280 140, 320 220, 400 220 C 480 220, 520 140, 600 140 C 680 140, 720 80, 800 80 C 880 80, 920 40, 1000 40"
}

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
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Estados del simulador interactivo
  const [simAmount, setSimAmount] = useState(2000)
  const [simDays, setSimDays] = useState(7)
  const [customAmountText, setCustomAmountText] = useState("15000")

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

  // Desplazar el mapa para centrar el paso activo en móviles
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeEl = scrollContainerRef.current.querySelector(`[data-step="${activeStep}"]`)
      if (activeEl) {
        const containerWidth = scrollContainerRef.current.offsetWidth
        const elementOffset = (activeEl as HTMLElement).offsetLeft
        const elementWidth = (activeEl as HTMLElement).offsetWidth
        scrollContainerRef.current.scrollTo({
          left: elementOffset - containerWidth / 2 + elementWidth / 2,
          behavior: "smooth"
        })
      }
    }
  }, [activeStep])

  // Desplazar Miguel a paso 1 al cambiar de modalidad
  useEffect(() => {
    setActiveStep(1)
    setOpenTipIdx(null)
  }, [modality])

  if (user) return null

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

  // Helper para rotación de Miguel sobre la moto en base al paso y modalidad
  const getMotorbikeRotation = (step: number, mode: "contado" | "cuotas" | "otro") => {
    if (mode === "contado") {
      switch (step) {
        case 1: return -15
        case 2: return 20
        case 3: return -20
        case 4: return 20
        case 5: return -15
        default: return 0
      }
    } else if (mode === "cuotas") {
      switch (step) {
        case 1: return 25
        case 2: return -25
        case 3: return 25
        case 4: return -25
        case 5: return 20
        default: return 0
      }
    } else {
      switch (step) {
        case 1: return -10
        case 2: return 0
        case 3: return -15
        case 4: return -20
        case 5: return -30
        default: return 0
      }
    }
  }

  const currentStepData = roadmapSteps[activeStep - 1]
  const activeCoords = stepCoordinates[modality][activeStep - 1]

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
    <section id="como-solicitar" className="relative py-24 px-4 sm:px-6 lg:px-10 border-t border-border overflow-hidden bg-background">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] pointer-events-none bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.03),transparent_65%)] animate-pulse" />

      <div className="mx-auto max-w-5xl relative z-10">
        

        {/* TITLE */}
        <div className="text-center mb-10">
          <p className="mb-3 text-[10px] sm:text-xs font-black tracking-[0.3em] text-primary uppercase select-none">
            Historia Interactiva
          </p>
          <h2 className="font-heading text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            El Viaje de Miguel 🎒
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Elige la modalidad para ver cómo cambia visualmente el camino de Miguel y simula su préstamo al instante antes de enviar tu registro.
          </p>
        </div>

        {/* MODALITY SELECTOR TABS */}
        <div className="flex justify-center mb-16 select-none">
          <div className="flex p-1.5 rounded-2xl border border-white/10 bg-zinc-950/60 backdrop-blur-md shadow-2xl max-w-md w-full">
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
                  className={`flex-1 py-3 rounded-xl text-xs font-extrabold tracking-wider transition-all duration-300 uppercase ${
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

        {/* WINDING ROAD INTERACTIVE MAP */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto scrollbar-none snap-x snap-mandatory pb-12 mb-8 relative border border-white/5 rounded-3xl bg-zinc-950/20 backdrop-blur-sm shadow-inner"
        >
          <div className="min-w-[1000px] h-[330px] relative px-10 flex items-center select-none pt-4">
            
            {/* Morphing road SVG */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-0"
              viewBox="0 0 1000 330"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="glow-contado" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#34d399" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.4" />
                </linearGradient>
                <linearGradient id="glow-cuotas" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#0891b2" stopOpacity="0.4" />
                </linearGradient>
                <linearGradient id="glow-otro" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#f472b6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#db2777" stopOpacity="0.4" />
                </linearGradient>
              </defs>

              {/* Glowing Road borders */}
              <path
                d={roadPaths[modality]}
                stroke={modality === "contado" ? "url(#glow-contado)" : modality === "cuotas" ? "url(#glow-cuotas)" : "url(#glow-otro)"}
                strokeWidth="48"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-75 blur-[4px] transition-all duration-700 ease-in-out"
              />

              {/* Dark asphalt highway base */}
              <path
                d={roadPaths[modality]}
                stroke="#18181b"
                strokeWidth="38"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-700 ease-in-out"
              />

              {/* Dotted lines in the middle */}
              <path
                d={roadPaths[modality]}
                stroke="#f4f4f5"
                strokeWidth="2"
                strokeDasharray="10 12"
                strokeLinecap="round"
                className="opacity-80 transition-all duration-700 ease-in-out"
              />
            </svg>

            {/* Rider: Miguel on his Motorcycle 🏍️ */}
            <div
              className="absolute z-20 pointer-events-none transition-all duration-700 ease-in-out"
              style={{
                left: `${activeCoords.x}px`,
                top: `${activeCoords.y}px`,
                transform: `translate(-50%, -50%) translate(-2px, -34px) rotate(${getMotorbikeRotation(activeStep, modality)}deg)`
              }}
            >
              <div className="relative flex flex-col items-center">
                {/* Floating "Miguel" bubble */}
                <div className="bg-primary text-primary-foreground text-[8px] font-black tracking-widest px-2 py-0.5 rounded shadow-lg border border-primary/20 mb-1 animate-bounce uppercase font-sans">
                  MIGUEL 🏍️
                </div>
                {/* Visual pulse indicator */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 h-12 w-12 rounded-full bg-primary/20 blur-md animate-ping pointer-events-none" />
              </div>
            </div>

            {/* RENDER STEPS ON COORD */}
            {roadmapSteps.map((step) => {
              const coords = stepCoordinates[modality][step.number - 1]
              const isSelected = activeStep === step.number
              
              // Bubble colors
              let glowStyle = step.glowClass
              if (isSelected) {
                if (step.number === 1) glowStyle = "border-orange-500 bg-orange-950/30 shadow-[0_0_25px_rgba(249,115,22,0.8)] scale-110 ring-4 ring-orange-500/10 text-orange-400"
                if (step.number === 2) glowStyle = "border-cyan-400 bg-cyan-950/30 shadow-[0_0_25px_rgba(34,211,238,0.8)] scale-110 ring-4 ring-cyan-500/10 text-cyan-400"
                if (step.number === 3) glowStyle = "border-emerald-400 bg-emerald-950/30 shadow-[0_0_25px_rgba(16,185,129,0.8)] scale-110 ring-4 ring-emerald-500/10 text-emerald-400"
                if (step.number === 4) glowStyle = "border-purple-400 bg-purple-950/30 shadow-[0_0_25px_rgba(168,85,247,0.8)] scale-110 ring-4 ring-purple-500/10 text-purple-400"
                if (step.number === 5) glowStyle = "border-yellow-400 bg-yellow-950/30 shadow-[0_0_25px_rgba(234,179,8,0.8)] scale-110 ring-4 ring-yellow-500/10 text-yellow-400 animate-pulse"
              } else {
                glowStyle = "bg-zinc-900 border-white/10 text-zinc-400 opacity-80 hover:opacity-100 hover:scale-105 hover:border-white/20 shadow-md"
              }

              const StepIcon = step.icon

              return (
                <div
                  key={step.number}
                  data-step={step.number}
                  style={{
                    left: `${coords.x}px`,
                    top: `${coords.y}px`
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-1.5 transition-all duration-700 ease-in-out"
                >
                  <div className="relative">
                    {/* Specialized CTA bubble for registration step */}
                    {step.number === 2 && (
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(239,68,68,0.5)] border border-red-400 animate-pulse whitespace-nowrap z-30 uppercase font-sans">
                        ¡REGÍSTRATE PRIMERO!
                      </div>
                    )}

                    {/* Step Bubble Button */}
                    <button
                      onClick={() => {
                        setActiveStep(step.number)
                        setOpenTipIdx(null)
                      }}
                      className={`h-20 w-20 rounded-full border-[2.5px] flex items-center justify-center transition-all duration-300 relative group overflow-hidden ${glowStyle}`}
                    >
                      {/* Animal Badge Background */}
                      <div className="absolute inset-0 p-2 opacity-25 group-hover:opacity-40 transition-opacity duration-300 flex items-center justify-center">
                        <img
                          src={step.animalBadge}
                          alt={step.animalName}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      {/* Content representation */}
                      <div className="relative z-10 flex flex-col items-center">
                        <StepIcon className="h-6 w-6 stroke-[2.5]" />
                        <span className="text-[7.5px] font-black uppercase tracking-widest mt-0.5">
                          Paso {step.number}
                        </span>
                      </div>

                      {/* Small floating animal indicator badge */}
                      <span className="absolute -bottom-1 -right-1 bg-zinc-950 border border-white/10 text-[9px] font-extrabold h-6 w-6 rounded-full flex items-center justify-center text-white shadow-lg">
                        {step.number === 1 ? "🐌" : step.number === 2 ? "🦜" : step.number === 3 ? "🐬" : step.number === 4 ? "🦫" : "🦎"}
                      </span>
                    </button>
                  </div>

                  {/* Step Name */}
                  <span className={`text-[10px] font-extrabold uppercase tracking-widest text-center max-w-[110px] truncate ${
                    isSelected ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" : "text-zinc-500"
                  }`}>
                    {step.number === 1 ? "1. Simular" : step.number === 2 ? "2. Registrarse" : step.number === 3 ? "3. Validar" : step.number === 4 ? "4. Cobrar" : "5. Subir Nivel"}
                  </span>
                </div>
              )
            })}

          </div>
        </div>

        {/* SCENARIO STORY DETAIL PANEL */}
        <div className="max-w-3xl mx-auto rounded-3xl border border-white/10 bg-zinc-950/80 backdrop-blur-lg p-6 sm:p-8 shadow-2xl relative transition-all duration-500 overflow-hidden">
          
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

          {/* Active step tag */}
          <div className="absolute -top-0.5 left-6 bg-primary text-primary-foreground text-[9px] font-black tracking-widest px-4 py-2 rounded-b-xl shadow-md uppercase">
            Paso {activeStep} de 5: Miguel en {modality === "contado" ? "Pago al Contado" : modality === "cuotas" ? "2 Cuotas" : "Otro Monto"}
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mt-6">
            
            {/* Miguel Character Avatar Graphic */}
            <div className="relative shrink-0 flex flex-col items-center">
              <div className="h-28 w-28 rounded-full overflow-hidden border-2 border-primary/30 bg-zinc-900/80 flex items-center justify-center p-2 shadow-inner relative group">
                <img
                  src="/images/rostro-ejemplo.png"
                  alt="Avatar Miguel"
                  className="h-full w-full object-cover rounded-full group-hover:scale-105 transition-transform duration-300"
                />
                {/* Floating Animal Avatar relative to progress */}
                <div className="absolute -bottom-1 -right-1 bg-zinc-950 border border-primary/40 text-sm h-8 w-8 rounded-full flex items-center justify-center shadow-lg">
                  {activeStep === 1 ? "🐌" : activeStep === 2 ? "🦜" : activeStep === 3 ? "🐬" : activeStep === 4 ? "🦫" : "🦎"}
                </div>
              </div>
              <span className="mt-3 text-xs font-black text-white tracking-wider">
                MIGUEL (MOTO RIDER 🏍️)
              </span>
              <span className="text-[10px] font-bold text-primary tracking-widest uppercase mt-0.5">
                {activeStep === 5 ? "Nivel Iguana 🦎" : "Nivel Caracol 🐌"}
              </span>
            </div>

            {/* Narrative Context */}
            <div className="flex-1 w-full text-center md:text-left">
              <h3 className="font-heading text-lg sm:text-2xl font-black text-white mb-2 flex items-center justify-center md:justify-start gap-2.5">
                <span className="font-mono text-primary font-black">{activeStep}.</span>
                {currentStepData.title}
              </h3>
              
              <p className="text-xs sm:text-sm leading-relaxed text-zinc-300 mb-4 font-medium">
                {currentStepData.stories[modality]}
              </p>

              {/* LIVE SIMULATOR FOR PASO 1 */}
              {activeStep === 1 && (
                <div className="my-5 p-5 rounded-2xl border border-white/5 bg-zinc-950/60 shadow-inner space-y-5 text-left">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 animate-pulse" />
                      Simula tu préstamo aquí mismo
                    </h4>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      Tasa BCV: Bs. {formatBs(bcvUsd)}
                    </span>
                  </div>

                  {modality === "otro" ? (
                    <div className="space-y-3">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                        Escribe el monto que necesitas
                      </label>
                      <div className="flex gap-2">
                        <span className="bg-zinc-900 border border-white/10 px-3.5 py-2.5 text-sm font-extrabold rounded-xl text-zinc-400 flex items-center">
                          Bs.
                        </span>
                        <input
                          type="text"
                          value={customAmountText}
                          onChange={(e) => setCustomAmountText(e.target.value.replace(/\D/g, ""))}
                          placeholder="Ej. 15000"
                          className="flex-1 bg-zinc-900 border border-white/10 px-4 py-2.5 text-sm font-extrabold rounded-xl text-white outline-none focus:border-primary/50 font-mono"
                        />
                      </div>
                      <p className="text-[11px] leading-relaxed text-zinc-400 mt-2">
                        💡 Este monto supera el límite inicial de Bs. 6.000, por lo que requerirá una entrevista corta vía WhatsApp con nuestro operador para habilitar tu perfil.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Slider de Monto */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-zinc-300">
                          <span>¿Cuánto dinero necesitas?</span>
                          <span className="text-primary font-mono font-black text-sm">
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
                          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-[9px] font-mono text-zinc-500">
                          <span>Bs. 1.000</span>
                          <span>Bs. 6.000</span>
                        </div>
                      </div>

                      {/* Plazo para Contado */}
                      {modality === "contado" && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                            ¿En cuántos días pagarás?
                          </span>
                          <div className="flex gap-2">
                            {[7, 15, 30].map((days) => (
                              <button
                                key={days}
                                onClick={() => setSimDays(days)}
                                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
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
                        <div className="bg-zinc-900/60 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                          <div className="text-xs">
                            <span className="font-bold text-zinc-300 block">Modalidad 2 Cuotas:</span>
                            <span className="text-[10px] text-zinc-400">Pagas el 50% de la cuota cada 15 días (quincenal).</span>
                          </div>
                          <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-black tracking-widest px-2 py-0.5 rounded uppercase">
                            Predefinido
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Resumen del Simulador */}
                  <div className="bg-zinc-900/80 p-4 rounded-xl border border-white/5 space-y-2.5 text-xs text-zinc-300">
                    <div className="flex justify-between font-mono">
                      <span>Monto solicitado (Bs)</span>
                      <span className="font-bold text-white">Bs. {formatBs(simulationResults.amountBs)}</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span>Equivalente en USD</span>
                      <span className="font-bold text-white">{formatUsd(simulationResults.amountUsd)}</span>
                    </div>

                    {modality !== "otro" && (
                      <>
                        <div className="flex justify-between items-center font-mono border-t border-white/5 pt-2">
                          <span>Tasa de Interés</span>
                          <div className="text-right">
                            {simulationResults.hasDiscount ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10.5px] line-through text-zinc-500 font-mono">
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
                          <div className="flex justify-between items-center border-t border-white/5 pt-2.5 bg-cyan-950/10 p-2 rounded-lg border border-cyan-500/10">
                            <span className="font-bold text-cyan-400 uppercase text-[10px] tracking-wider">Abono por Cuota (2 cuotas)</span>
                            <div className="text-right">
                              <span className="block font-black text-cyan-300 text-sm font-mono">
                                Bs. {formatBs(simulationResults.installmentBs)}
                              </span>
                              <span className="text-[9px] text-zinc-400 block font-mono">
                                ({formatUsd(simulationResults.installmentUsd)} USD)
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center border-t border-white/5 pt-2.5 bg-primary/5 p-2 rounded-lg border border-primary/10">
                            <span className="font-bold text-primary uppercase text-[10px] tracking-wider">Total a Pagar</span>
                            <div className="text-right">
                              {simulationResults.hasDiscount ? (
                                <div className="flex flex-col items-end">
                                  <span className="text-[10px] line-through text-zinc-500 font-mono">
                                    Bs. {formatBs(simulationResults.originalTotalBs || 0)}
                                  </span>
                                  <span className="font-black text-emerald-400 text-sm font-mono">
                                    Bs. {formatBs(simulationResults.totalBs)}
                                  </span>
                                </div>
                              ) : (
                                <span className="font-black text-white text-sm font-mono">
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
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold p-2 rounded-lg text-center flex items-center justify-center gap-1">
                        <Sparkles className="h-3 w-3 animate-pulse" />
                        ¡Descuento de 15% por Pago Pronto (dentro de 7 días) aplicado al interés!
                      </div>
                    )}
                  </div>

                </div>
              )}

              <p className="text-xs leading-relaxed text-primary/80 font-medium italic border-l-2 border-primary/40 pl-3.5 mb-6 text-left">
                {currentStepData.details[modality]}
              </p>

              {/* Floating Tips */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase text-left block select-none">
                  Consejos prácticos del paso:
                </label>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start select-none">
                  {currentStepData.tips.map((tip, idx) => {
                    const isTipOpen = openTipIdx === idx
                    return (
                      <div key={idx} className="relative">
                        <button
                          onClick={() => setOpenTipIdx(isTipOpen ? null : idx)}
                          className={`rounded-xl px-4 py-2.5 text-[11px] font-extrabold flex items-center gap-1.5 transition-all ${
                            isTipOpen
                              ? "bg-primary text-primary-foreground shadow-lg"
                              : "bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10"
                          }`}
                        >
                          <HelpCircle className="h-3.5 w-3.5" />
                          {tip.label}
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* Display Opened Floating Tip Detail */}
                {openTipIdx !== null && (
                  <div className="mt-3 p-4 rounded-xl border border-white/5 bg-zinc-900/60 text-xs text-zinc-300 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200 text-left">
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
              className="text-xs font-bold text-zinc-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" /> Atrás
            </button>

            <span className="text-[11px] font-mono font-bold tracking-wider text-zinc-500">
              Paso {activeStep} / 5
            </span>

            <button
              onClick={() => {
                setActiveStep((prev) => (prev < 5 ? prev + 1 : 1))
                setOpenTipIdx(null)
              }}
              className="text-xs font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1 cursor-pointer"
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </button>
          </div>

        </div>

      </div>
    </section>
  )
}
