"use client"

import { useState, useEffect, useRef } from "react"
import { Sparkles, ChevronRight, ChevronLeft, X } from "lucide-react"

interface TourStep {
  targetId: string
  title: string
  description: string
}

const tourSteps: TourStep[] = [
  {
    targetId: "", // Se centra en pantalla
    title: "¡Bienvenido/a! 🎒",
    description: "¡Hola! Soy Cuni, tu asistente virtual de RESUELVE YA! 🐆 Te daré un breve recorrido de 1 minuto para explicarte cómo sacarle el máximo provecho a tu cuenta de socio. ¿Empezamos?"
  },
  {
    targetId: "tour-modalidad",
    title: "Paso 1: Tres Modalidades de Pago 💸",
    description: "¡Aquí es donde empieza la magia! Elige cómo pagar tu préstamo:\n\n• Pago Total (Contado): Pagas todo en un único vencimiento. ¡Te doy 15% de descuento en intereses si pagas antes de 7 días!\n• Cuotas: Divides el saldo en 2 cuotas quincenales para tu comodidad.\n• Otros Montos: Para montos superiores, lo coordinas directamente con un operador."
  },
  {
    targetId: "tour-nivel",
    title: "Paso 2: Niveles de Socio 🦎",
    description: "¡Cada pago a tiempo es un logro! Inicias en el Nivel Caracol 🐌 y asciendes a Guacamaya 🦜, Delfín 🐬, Chigüire 🦫 e Iguana 🦎. Subir niveles incrementa tu límite automático hasta Bs. 50.000 y te otorga descuentos permanentes en tasas de interés."
  },
  {
    targetId: "historial",
    title: "Paso 3: Historial de Préstamos 📅",
    description: "Aquí llevo el registro de tus créditos en tiempo real. Podrás ver si tu solicitud está en verificación, aprobada o pagada para que lleves un control total de tus finanzas."
  },
  {
    targetId: "preguntas-frecuentes",
    title: "Paso 4: Preguntas Frecuentes 💡",
    description: "¿Tienes dudas sobre iniciales, plazos o intereses? En esta sección respondo a tus preguntas más comunes de forma directa. Recuerda: ¡en RESUELVE YA! NUNCA pedimos adelantos de dinero."
  },
  {
    targetId: "contacto",
    title: "Paso 5: Soporte Directo WhatsApp 🟢",
    description: "¿Necesitas ayuda personalizada o tienes dudas con tu verificación? Haz clic en este botón para escribirnos a WhatsApp. ¡Mis compañeros operadores te atenderán de inmediato!"
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
        let phone = ""
        try {
          const userObj = JSON.parse(storedUser)
          if (userObj) {
            if (userObj.nombres) {
              // Extraer primer nombre
              const firstName = userObj.nombres.split(" ")[0]
              setUserName(firstName)
            }
            if (userObj.telefono) {
              phone = userObj.telefono
            }
          }
        } catch (e) {
          setUserName("")
        }

        const tourCompletedKey = phone ? `tour_completed_${phone}` : "tour_completed"
        const tourCompleted = localStorage.getItem(tourCompletedKey)

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
    // Ancho aproximado del contenedor con la mascota en escritorio (se añade margen)
    const mascotOffset = window.innerWidth >= 768 ? 120 : 0 

    const targetTop = targetRect.top - padding
    const targetBottom = targetRect.bottom + padding
    const targetLeft = targetRect.left - padding
    const targetWidth = targetRect.width + padding * 2

    // Calcular posición horizontal (centrado con offset para la mascota en escritorio)
    let left = targetLeft + targetWidth / 2 - (tooltipWidth + mascotOffset) / 2
    // Clampar para no salirse de la pantalla
    left = Math.max(16, Math.min(left, window.innerWidth - (tooltipWidth + mascotOffset) - 16))

    // Calcular posición vertical (colocar abajo si hay espacio, si no, colocar arriba)
    let top = targetBottom + 12

    if (top + tooltipHeight > window.innerHeight - 16) {
      top = targetTop - tooltipHeight - 12
    }

    setTooltipStyle({
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth + mascotOffset}px`,
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
    const storedUser = localStorage.getItem("user")
    let phone = ""
    if (storedUser) {
      try {
        const userObj = JSON.parse(storedUser)
        if (userObj && userObj.telefono) {
          phone = userObj.telefono
        }
      } catch {}
    }
    const tourCompletedKey = phone ? `tour_completed_${phone}` : "tour_completed"
    localStorage.setItem(tourCompletedKey, "true")
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
      {/* Estilos CSS Inline de Micro-animaciones y soporte burbuja */}
      <style>{`
        @keyframes tour-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-tour-float {
          animation: tour-float 3s ease-in-out infinite;
        }
      `}</style>

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

      {/* Contenedor principal que agrupa a la Mascota y al Globo de Diálogo */}
      <div
        ref={tooltipRef}
        style={tooltipStyle}
        className="relative z-[101] flex flex-col md:flex-row items-center md:items-end gap-5 w-[92vw] select-none text-left animate-in zoom-in-95 duration-200"
      >
        {/* MASCOTA EN ESCRITORIO (Se muestra al lado izquierdo del globo) */}
        {!isIntro && (
          <div className="hidden md:flex flex-col items-center shrink-0 z-20 animate-tour-float">
            <div className="relative h-24 w-24 rounded-full border-2 border-primary bg-zinc-900 shadow-[0_0_20px_rgba(59,130,246,0.3)] overflow-hidden flex items-center justify-center p-1.5 ring-4 ring-primary/10">
              <img
                src="/images/mascota.png"
                alt="Cuni Asistente"
                className="h-full w-full object-contain"
              />
            </div>
            <span className="mt-1.5 bg-primary text-primary-foreground text-[8px] font-black px-2.5 py-0.5 rounded-full border border-primary/20 shadow uppercase tracking-wider font-sans">
              Cuni 🐆
            </span>
          </div>
        )}

        {/* GLOBO DE DIÁLOGO / TARJETA DE GUÍA */}
        <div className="rounded-3xl border border-white/10 bg-zinc-950/95 backdrop-blur-xl p-5 md:p-6 shadow-[0_0_50px_rgba(59,130,246,0.2)] flex flex-col gap-4 w-full md:max-w-[360px] relative">
          
          {/* Flecha de diálogo en escritorio apuntando a la mascota */}
          {!isIntro && (
            <div className="hidden md:block absolute left-[-6px] bottom-12 w-3 h-3 bg-zinc-950 border-l border-b border-white/10 rotate-45" />
          )}

          {/* MASCOTA EN BIENVENIDA (Paso 0 - Centrado arriba del texto) */}
          {isIntro && (
            <div className="flex flex-col items-center gap-2 mb-1">
              <div className="h-24 w-24 rounded-full border-2 border-primary bg-zinc-900 shadow-[0_0_25px_rgba(59,130,246,0.4)] overflow-hidden flex items-center justify-center p-2 ring-4 ring-primary/10 animate-tour-float">
                <img
                  src="/images/mascota.png"
                  alt="Cuni Asistente"
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="bg-primary text-primary-foreground text-[8.5px] font-black px-3 py-0.5 rounded-full border border-primary/20 shadow uppercase tracking-widest font-sans">
                Cuni Asistente 🐆
              </span>
            </div>
          )}

          {/* Encabezado */}
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <div className="flex items-center gap-2">
              {/* Mascot avatar en cabecera en móvil (oculto en escritorio) */}
              {!isIntro && (
                <div className="h-8 w-8 rounded-full border border-primary/20 bg-zinc-900 overflow-hidden flex items-center justify-center p-0.5 shrink-0 md:hidden animate-tour-float">
                  <img src="/images/mascota.png" alt="Cuni" className="h-full w-full object-contain" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-1 text-primary text-[10px] font-black uppercase tracking-widest leading-none">
                  <Sparkles className="h-3 w-3 animate-pulse" />
                  Cuni · Asistente Virtual
                </div>
              </div>
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
      </div>
    </>
  )
}
