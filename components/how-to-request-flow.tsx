"use client"

import { useState, useEffect, useRef } from "react"
import { Calculator, UserCheck, MessageSquare, CreditCard, ChevronLeft, ChevronRight } from "lucide-react"

interface FlowStep {
  number: string
  title: string
  desc: string
  image: string
  icon: any
}

const flowSteps: FlowStep[] = [
  {
    number: "01",
    title: "Simula tu préstamo",
    desc: "Ajusta el monto en el simulador usando las 3 opciones de configuración disponibles: el monto que deseas solicitar, la modalidad de pago (Pago Contado o Cuotas) y la fecha de tu comodidad para cancelar.",
    image: "/images/step-1.png",
    icon: Calculator
  },
  {
    number: "02",
    title: "Regístrate y verifica",
    desc: "Crea tu cuenta ingresando tus datos de contacto y residencia. Sube una foto clara de tu cédula y una selfie frontal de tu rostro para que nuestro sistema valide tu cuenta de forma segura.",
    image: "/images/step-2.png",
    icon: UserCheck
  },
  {
    number: "03",
    title: "Contacto por un operador",
    desc: "Nuestro equipo de operadores analizará tu solicitud y se pondrá en contacto contigo de forma personalizada vía WhatsApp o llamada para confirmar los datos y resolver cualquier duda.",
    image: "/images/step-1-logged.png",
    icon: MessageSquare
  },
  {
    number: "04",
    title: "Recibe por Pago Móvil",
    desc: "¡Listo! Una vez aprobado el préstamo, el operador enviará el dinero inmediatamente a tu cuenta bancaria a través de Pago Móvil. Rápido, seguro y sin trámites complicados.",
    image: "/images/step-3.png",
    icon: CreditCard
  }
]

export function HowToRequestFlow() {
  const [user, setUser] = useState<any>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)

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

  const handleScroll = () => {
    if (carouselRef.current) {
      const width = carouselRef.current.offsetWidth
      const scrollLeft = carouselRef.current.scrollLeft
      const index = Math.round(scrollLeft / width)
      setCurrentIndex(index)
    }
  }

  const scrollToStep = (index: number) => {
    if (carouselRef.current) {
      const width = carouselRef.current.offsetWidth
      carouselRef.current.scrollTo({
        left: width * index,
        behavior: "smooth"
      })
      setCurrentIndex(index)
    }
  }

  const handlePrev = () => {
    const nextIndex = currentIndex > 0 ? currentIndex - 1 : flowSteps.length - 1
    scrollToStep(nextIndex)
  }

  const handleNext = () => {
    const nextIndex = currentIndex < flowSteps.length - 1 ? currentIndex + 1 : 0
    scrollToStep(nextIndex)
  }

  // Si el usuario está logueado, no se muestra esta sección
  if (user) return null

  return (
    <section id="como-solicitar" className="relative py-20 px-4 sm:px-6 lg:px-10 border-t border-border overflow-hidden bg-background">
      {/* Glow Effect */}
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] pointer-events-none bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.03),transparent_65%)]" />

      <div className="mx-auto max-w-5xl relative z-10">
        <div className="text-center mb-12">
          <p className="mb-3 text-[10px] sm:text-xs font-bold tracking-[0.25em] text-primary uppercase">
            Guía Paso a Paso
          </p>
          <h2 className="font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            ¿Cómo solicitar tu préstamo?
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Descubre lo fácil y rápido que es obtener tu financiamiento con nosotros. Sigue este sencillo flujo deslizando las tarjetas.
          </p>
        </div>

        {/* Carousel Container */}
        <div className="relative group max-w-3xl mx-auto">
          {/* Arrow Left */}
          <button
            onClick={handlePrev}
            className="absolute left-[-20px] sm:left-[-50px] top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full border border-border bg-card/80 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground transition-all opacity-0 group-hover:opacity-100 hidden sm:flex hover:scale-105"
            aria-label="Anterior paso"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Slider */}
          <div
            ref={carouselRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none scroll-smooth rounded-2xl border border-border bg-card/25 backdrop-blur-md"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {flowSteps.map((step, idx) => {
              const StepIcon = step.icon
              return (
                <div
                  key={step.number}
                  className="w-full shrink-0 snap-center p-6 sm:p-10 flex flex-col md:flex-row items-center gap-8 min-h-[360px]"
                >
                  {/* Image container */}
                  <div className="relative h-44 w-44 sm:h-52 sm:w-52 rounded-full overflow-hidden border border-border bg-background shadow-lg flex items-center justify-center shrink-0">
                    <img
                      src={step.image}
                      alt={step.title}
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <div className="absolute top-3 left-3 bg-primary text-primary-foreground font-mono text-xs font-bold h-7 w-7 rounded-full flex items-center justify-center shadow">
                      {step.number}
                    </div>
                  </div>

                  {/* Content container */}
                  <div className="flex-1 flex flex-col justify-center text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2.5 mb-3 text-primary">
                      <span className="p-1.5 rounded-lg bg-primary/10">
                        <StepIcon className="h-5 w-5" />
                      </span>
                      <span className="text-[10px] font-extrabold tracking-widest uppercase">
                        PASO {step.number}
                      </span>
                    </div>

                    <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground mb-3 leading-tight">
                      {step.title}
                    </h3>
                    <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground text-pretty">
                      {step.desc}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Arrow Right */}
          <button
            onClick={handleNext}
            className="absolute right-[-20px] sm:right-[-50px] top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full border border-border bg-card/80 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground transition-all opacity-0 group-hover:opacity-100 hidden sm:flex hover:scale-105"
            aria-label="Siguiente paso"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Dots Indicator */}
        <div className="flex justify-center gap-2 mt-6">
          {flowSteps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => scrollToStep(idx)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                currentIndex === idx ? "bg-primary w-6" : "bg-muted hover:bg-muted-foreground/40 w-2.5"
              }`}
              aria-label={`Ir al paso ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
