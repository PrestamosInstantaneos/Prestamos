"use client"

import { useState, useEffect, useRef } from "react"
import { Sparkles, HelpCircle, ChevronRight, ChevronLeft, X } from "lucide-react"

interface TourStep {
  targetId: string
  title: string
  description: string
}

const tourSteps: TourStep[] = [
  {
    targetId: "", // Se centra en pantalla
    title: "¡Bienvenido/a! 🎒",
    description: "Te damos la bienvenida a tu panel de socio. ¿Deseas realizar una breve guía rápida de 1 minuto para aprender cómo funciona la página, el simulador y tus niveles?"
  },
  {
    targetId: "tour-modalidad",
    title: "Paso 1: Tres Modalidades de Pago 💸",
    description: "Aquí eliges cómo pagar tu préstamo:\n\n• Pago Total (Contado): Cancelas todo en un único pago y obtienes 15% de descuento en intereses por pronto pago.\n• Cuotas: Divides el préstamo en 2 cuotas quincenales para tu comodidad.\n• Otros Montos: Para emergencias mayores que desees acordar personalmente con un operador."
  },
  {
    targetId: "tour-nivel",
    title: "Paso 2: Niveles de Socio 🦎",
    description: "¡Pagar a tiempo es la clave! Cada pago puntual te hace subir de nivel. Inicias como Caracol 🐌 y asciendes a Guacamaya 🦜, Delfín 🐬, Chigüire 🦫 e Iguana 🦎. ¡Subir de nivel incrementa tu límite de préstamo automático hasta Bs. 50.000 y te otorga descuentos permanentes en tasas!"
  },
  {
    targetId: "historial",
    title: "Paso 3: Historial de Préstamos 📅",
    description: "En esta sección puedes revisar en tiempo real el estatus de tus solicitudes (por aprobar, pendientes por pagar, activas o pagadas) y llevar un control total de tus transacciones."
  },
  {
    targetId: "preguntas-frecuentes",
    title: "Paso 4: Preguntas Frecuentes 💡",
    description: "¿Tienes dudas sobre plazos, iniciales o cómo recuperar tu cuenta? En esta sección respondemos todas las consultas de forma 100% transparente. ¡Recuerda que nunca pedimos dinero por adelantado!"
  },
  {
    targetId: "contacto",
    title: "Paso 5: Soporte Directo WhatsApp 🟢",
    description: "¿Necesitas ayuda personalizada o tienes dudas con tu verificación? Haz clic aquí para chatear directamente por WhatsApp con uno de nuestros operadores oficiales. ¡Estamos listos para atenderte!"
  }
]

export function ProductTour() {
  const [activeStep, setActiveStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [userName, setUserName] = useState("")
  
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 101,
  })

  // Verificar si se inicia sesión por primera vez y activar el tour
  useEffect(() => {
    function checkTourStatus() {
      const storedUser = localStorage.getItem("user")
      const tourCompleted = localStorage.getItem("tour_completed")
      
      if (storedUser) {
        try {
          const userObj = JSON.parse(storedUser)
          if (userObj && userObj.nombres) {
            // Extraer primer nombre
            const firstName = userObj.nombres.split(" ")[0]
            setUserName(firstName)
          }
        } catch (e) {
          setUserName("")
        }

        // Si no ha completado el tour, iniciarlo
        if (!tourCompleted) {
          setIsVisible(true)
          setActiveStep(0)
        } else {
          setIsVisible(false)
        }
      } else {
        setIsVisible(false)
      }
    }

    checkTourStatus()
    window.addEventListener("auth-change", checkTourStatus)
    return () => {
      window.removeEventListener("auth-change", checkTourStatus)
    }
  }, [])

  // Desplazar y enfocar el elemento activo
  useEffect(() => {
    if (!isVisible) return

    const step = tourSteps[activeStep]
    if (!step || !step.targetId) {
      setTargetRect(null)
      return
    }

    // Scroll suave al elemento objetivo
    const el = document.getElementById(step.targetId)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
    }

    // Esperar un momento a que termine el scroll para medir la posición
    const timer = setTimeout(() => {
      measureElement()
    }, 450)

    return () => clearTimeout(timer)
  }, [activeStep, isVisible])

  // Medir el elemento enfocado
  const measureElement = () => {
    if (!isVisible) return
    const step = tourSteps[activeStep]
    if (!step || !step.targetId) {
      setTargetRect(null)
      return
    }

    const el = document.getElementById(step.targetId)
    if (el) {
      const rect = el.getBoundingClientRect()
      setTargetRect(rect)
    } else {
      setTargetRect(null)
    }
  }

  // Escuchar eventos de scroll y resize para ajustar la máscara y el tooltip en tiempo real
  useEffect(() => {
    if (!isVisible) return

    const handleUpdate = () => {
      measureElement()
    }

    window.addEventListener("scroll", handleUpdate, { passive: true })
    window.addEventListener("resize", handleUpdate)

    return () => {
      window.removeEventListener("scroll", handleUpdate)
      window.removeEventListener("resize", handleUpdate)
    }
  }, [isVisible, activeStep])

  // Ajustar la posición de la tarjeta de diálogo (tooltip) respecto al spotlight
  useEffect(() => {
    if (!isVisible) return

    if (activeStep === 0 || !targetRect) {
      // Si estamos en la bienvenida o no hay elemento enfocado, centrar el tooltip en la pantalla
      setTooltipStyle({
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 101,
        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      })
      return
    }

    const padding = 10
    const tooltipWidth = tooltipRef.current?.offsetWidth || 340
    const tooltipHeight = tooltipRef.current?.offsetHeight || 190

    const targetTop = targetRect.top - padding
    const targetBottom = targetRect.bottom + padding
    const targetLeft = targetRect.left - padding
    const targetWidth = targetRect.width + padding * 2

    // Calcular posición horizontal (centrado respecto al target)
    let left = targetLeft + targetWidth / 2 - tooltipWidth / 2
    // Clampar para no salirse de la pantalla
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16))

    // Calcular posición vertical (colocar abajo si hay espacio, si no, colocar arriba)
    let top = targetBottom + 12

    if (top + tooltipHeight > window.innerHeight - 16) {
      top = targetTop - tooltipHeight - 12
    }

    setTooltipStyle({
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
      zIndex: 101,
      transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    })
  }, [targetRect, isVisible, activeStep])

  const handleNext = () => {
    if (activeStep < tourSteps.length - 1) {
      setActiveStep((prev) => prev + 1)
    } else {
      handleFinish()
    }
  }

  const handlePrev = () => {
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1)
    }
  }

  const handleFinish = () => {
    localStorage.setItem("tour_completed", "true")
    setIsVisible(false)
  }

  if (!isVisible) return null

  // Calcular las dimensiones para el foco del SVG
  const padding = 10
  const spotlightX = targetRect ? targetRect.left - padding : 0
  const spotlightY = targetRect ? targetRect.top - padding : 0
  const spotlightW = targetRect ? targetRect.width + padding * 2 : 0
  const spotlightH = targetRect ? targetRect.height + padding * 2 : 0

  const currentStepData = tourSteps[activeStep]
  const isIntro = activeStep === 0
  const stepTitle = isIntro 
    ? `¡Hola, ${userName || "Socio"}! 🎒` 
    : currentStepData.title

  return (
    <>
      {/* Fondo traslúcido con máscara recortadora */}
      <svg className="fixed inset-0 w-screen h-screen z-[99] pointer-events-none">
        <defs>
          <mask id="product-tour-mask">
            {/* Rellena todo de blanco (bloquea la transparencia) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* El recorte del spotlight va de negro (hace el hueco transparente) */}
            {!isIntro && targetRect && (
              <rect
                x={spotlightX}
                y={spotlightY}
                width={spotlightW}
                height={spotlightH}
                rx="12"
                ry="12"
                fill="black"
              />
            )}
          </mask>
        </defs>

        {/* El fondo oscuro que se dibuja con la máscara */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="black"
          opacity={isIntro ? "0.8" : "0.7"}
          mask="url(#product-tour-mask)"
          className="pointer-events-auto animate-in fade-in duration-300"
        />
      </svg>

      {/* Tarjeta de guía (Tooltip Popover) */}
      <div
        ref={tooltipRef}
        style={tooltipStyle}
        className="rounded-3xl border border-white/10 bg-zinc-950/95 backdrop-blur-xl p-6 shadow-[0_0_50px_rgba(59,130,246,0.2)] flex flex-col gap-4 max-w-[360px] w-[92vw] select-none text-left animate-in zoom-in-95 duration-200"
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-1.5 text-primary text-[10px] font-black uppercase tracking-widest">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            Guía de Inicio
          </div>
          <button
            onClick={handleFinish}
            className="text-zinc-500 hover:text-white transition-colors cursor-pointer rounded-full p-1 hover:bg-white/5"
            title="Omitir Guía"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="space-y-2">
          <h3 className="font-heading font-black text-base sm:text-lg text-white tracking-tight">
            {stepTitle}
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed font-medium whitespace-pre-line">
            {currentStepData.description}
          </p>
        </div>

        {/* Barra de progreso visual */}
        <div className="flex gap-1.5 mt-2">
          {tourSteps.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                idx === activeStep ? "bg-primary w-6 shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "bg-white/10"
              }`}
            />
          ))}
        </div>

        {/* Botones de navegación */}
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
          <button
            onClick={handleFinish}
            className="text-[10px] font-black text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest"
          >
            {isIntro ? "No, gracias" : "Omitir"}
          </button>

          <div className="flex gap-2">
            {!isIntro && activeStep > 0 && (
              <button
                onClick={handlePrev}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-zinc-300 hover:text-white transition-all bg-white/5 flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Atrás
              </button>
            )}

            <button
              onClick={handleNext}
              className="rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:scale-[1.02] active:scale-98 transition-all flex items-center gap-1 cursor-pointer shadow-lg shadow-primary/20"
            >
              {isIntro 
                ? "Sí, comenzar recorrido" 
                : activeStep === tourSteps.length - 1 
                  ? "Finalizar" 
                  : "Siguiente"}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
