"use client"

import { useState, useEffect } from "react"
import { Calculator, UserCheck, MessageSquare, CreditCard, Award, HelpCircle, Check, HelpCircle as HelpIcon } from "lucide-react"

interface RoadmapStep {
  number: number
  title: string
  story: string
  detail: string
  icon: any
  tips: {
    label: string
    content: string
  }[]
}

const roadmapSteps: RoadmapStep[] = [
  {
    number: 1,
    title: "Miguel Simula su Préstamo",
    story: "Miguel necesita reparar su moto y decide solicitar un préstamo en RESUELVE YA!. Usa el simulador y ajusta las 3 opciones de configuración: el monto en bolívares, si pagará al contado o en cuotas, y selecciona su fecha de cobro preferida.",
    detail: "Miguel elige su fecha de cobro para asegurar que tendrá el dinero disponible en su cuenta y no arriesgarse a atrasarse.",
    icon: Calculator,
    tips: [
      {
        label: "¿Por qué elige la fecha de cobro?",
        content: "Para coordinar su fecha de pago con el día exacto en que recibe su salario, asegurando comodidad y cero mora."
      },
      {
        label: "3 Opciones Clave",
        content: "Monto del préstamo, tipo de pago (Total o Cuotas) y fechas de pago exactas."
      }
    ]
  },
  {
    number: 2,
    title: "Miguel se Registra y Verifica",
    story: "Miguel ingresa al registro. Rellena sus datos básicos, sube una foto nítida de su cédula y se toma una selfie frontal clara del rostro. Así nuestro sistema puede autenticar su identidad.",
    detail: "Para una validación veloz, Miguel se quita la gorra y los lentes, y toma la foto de su cédula en un espacio bien iluminado.",
    icon: UserCheck,
    tips: [
      {
        label: "Tip de Cédula",
        content: "Asegúrate de que no haya brillos en la foto y que todos los textos sean legibles."
      },
      {
        label: "Tip de Selfie",
        content: "Sube una foto frontal de tu rostro con buena iluminación y sin accesorios."
      }
    ]
  },
  {
    number: 3,
    title: "Contacto con el Operador",
    story: "Un operador de soporte de RESUELVE YA! recibe la solicitud de Miguel en su sistema de administración y le escribe directamente a su WhatsApp para validar sus datos de Pago Móvil.",
    detail: "Los operadores revisan y validan que el titular de la cédula sea el mismo titular de la cuenta bancaria para evitar suplantaciones.",
    icon: MessageSquare,
    tips: [
      {
        label: "Canal Oficial",
        content: "El operador te contactará únicamente por WhatsApp oficial de soporte."
      },
      {
        label: "Validación de Cuenta",
        content: "Se verifica que el Pago Móvil coincida con tu número de cédula para tu seguridad bancaria."
      }
    ]
  },
  {
    number: 4,
    title: "Desembolso por Pago Móvil",
    story: "Tras confirmar los datos, el operador aprueba la solicitud. El sistema transfiere los bolívares de inmediato mediante Pago Móvil a la cuenta bancaria de Miguel.",
    detail: "En menos de 2 horas hábiles, Miguel tiene el dinero en su cuenta y listo para reparar su moto.",
    icon: CreditCard,
    tips: [
      {
        label: "Pago Móvil Instantáneo",
        content: "Una vez aprobado por el operador, la transferencia es inmediata."
      },
      {
        label: "Sin Cobros Iniciales",
        content: "¡Ojo! Nunca te pediremos depósitos ni comisiones previas para entregarte el préstamo."
      }
    ]
  },
  {
    number: 5,
    title: "Pago Puntual y Nivel de Beneficios",
    story: "Miguel repara su moto y, al recibir su sueldo, realiza el pago de su préstamo vía Pago Móvil. Al pagar puntual, su cuenta sube automáticamente al Nivel 2 (Iguana).",
    detail: "Subir de nivel incrementa el límite de sus préstamos hasta Bs. 9.000bs y le da acceso a descuentos especiales de interés.",
    icon: Award,
    tips: [
      {
        label: "Subir de Nivel",
        content: "Al pagar puntual dejas de ser nivel Caracol (límite Bs. 6.000) y subes a Iguana (límite Bs. 9.000)."
      },
      {
        label: "Pronto Pago",
        content: "Si pagas en 7 días o menos, ¡tienes un 15% de descuento directo en tus intereses!"
      }
    ]
  }
]

export function HowToRequestFlow() {
  const [user, setUser] = useState<any>(null)
  const [activeStep, setActiveStep] = useState(1)
  const [openTipIdx, setOpenTipIdx] = useState<number | null>(null)

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

  if (user) return null

  const currentStepData = roadmapSteps[activeStep - 1]

  return (
    <section id="como-solicitar" className="relative py-24 px-4 sm:px-6 lg:px-10 border-t border-border overflow-hidden bg-background">
      {/* Background Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] pointer-events-none bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.03),transparent_60%)] animate-pulse" />

      <div className="mx-auto max-w-5xl relative z-10">
        <div className="text-center mb-16">
          <p className="mb-3 text-[10px] sm:text-xs font-bold tracking-[0.25em] text-primary uppercase">
            Mapa de Ruta Interactivo
          </p>
          <h2 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            El Viaje de Miguel 🚀
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Sigue los pasos interactivos para ver cómo Miguel solicita, recibe y paga su préstamo de forma segura en RESUELVE YA!.
          </p>
        </div>

        {/* Roadmap Map Layout */}
        <div className="relative mb-12">
          {/* Timeline Connector Line */}
          <div className="absolute top-1/2 left-[5%] right-[5%] h-1 bg-border -translate-y-1/2 z-0 hidden md:block" />

          {/* Stepper Buttons */}
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4 max-w-4xl mx-auto">
            {roadmapSteps.map((step) => {
              const StepIcon = step.icon
              const isCompleted = step.number < activeStep
              const isActive = step.number === activeStep

              return (
                <button
                  key={step.number}
                  onClick={() => {
                    setActiveStep(step.number)
                    setOpenTipIdx(null)
                  }}
                  className={`flex md:flex-col items-center gap-4 md:gap-2.5 transition-all duration-300 outline-none group ${
                    isActive ? "scale-110" : "opacity-80 hover:opacity-100"
                  }`}
                >
                  {/* Step Bubble */}
                  <div
                    className={`h-14 w-14 rounded-full border flex items-center justify-center relative shadow-lg transition-all ${
                      isActive
                        ? "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20 scale-105"
                        : isCompleted
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-500"
                        : "bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-6 w-6 stroke-[3]" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}

                    {/* Step Number Badge */}
                    <span className="absolute -top-1 -right-1 bg-zinc-950 border border-border text-[9px] font-bold h-5 w-5 rounded-full flex items-center justify-center">
                      {step.number}
                    </span>
                  </div>

                  {/* Title Label */}
                  <span
                    className={`text-xs font-bold tracking-wide transition-colors ${
                      isActive ? "text-primary font-extrabold" : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    Paso {step.number}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Dynamic Story Display Card */}
        <div className="max-w-3xl mx-auto rounded-2xl border border-border bg-card/30 backdrop-blur-md p-6 sm:p-8 shadow-2xl relative transition-all duration-500">
          
          {/* Mini Character Tag */}
          <div className="absolute -top-4 left-6 bg-primary text-primary-foreground text-[10px] font-extrabold tracking-widest px-3 py-1.5 rounded-full shadow-md uppercase">
            Escenario de Miguel
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mt-4">
            
            {/* Miguel Character Avatar Graphic */}
            <div className="relative shrink-0 flex flex-col items-center">
              <div className="h-28 w-28 rounded-full overflow-hidden border-2 border-primary/30 bg-secondary/30 flex items-center justify-center p-2 shadow-inner">
                <img
                  src="/images/rostro-ejemplo.png"
                  alt="Avatar Miguel"
                  className="h-full w-full object-cover rounded-full"
                />
              </div>
              <span className="mt-2 text-xs font-extrabold text-foreground tracking-wider">
                MIGUEL (Cliente)
              </span>
              <span className="text-[9px] font-bold text-primary tracking-widest uppercase">
                {activeStep === 5 ? "Nivel Iguana 🦎" : "Nivel Caracol 🐌"}
              </span>
            </div>

            {/* Narrative Context */}
            <div className="flex-1 flex flex-col justify-center text-center md:text-left">
              <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground mb-3 flex items-center justify-center md:justify-start gap-2.5">
                <span className="font-mono text-primary font-extrabold">{activeStep}.</span>
                {currentStepData.title}
              </h3>
              
              <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground mb-4">
                {currentStepData.story}
              </p>

              <p className="text-xs leading-relaxed text-primary/80 font-medium italic border-l-2 border-primary/40 pl-3.5 mb-6 text-left">
                {currentStepData.detail}
              </p>

              {/* Floating Tips / Scenario Buttons */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase text-left block">
                  Presiona los botones flotantes de ayuda:
                </label>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  {currentStepData.tips.map((tip, idx) => {
                    const isTipOpen = openTipIdx === idx
                    return (
                      <div key={idx} className="relative">
                        <button
                          onClick={() => setOpenTipIdx(isTipOpen ? null : idx)}
                          className={`rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 transition-all ${
                            isTipOpen
                              ? "bg-primary text-primary-foreground shadow"
                              : "bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20"
                          }`}
                        >
                          <HelpIcon className="h-3.5 w-3.5" />
                          {tip.label}
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* Display Opened Floating Tip Detail */}
                {openTipIdx !== null && (
                  <div className="mt-3 p-4 rounded-xl border border-primary/20 bg-primary/5 text-xs text-foreground leading-relaxed animate-fade-in text-left">
                    <strong className="font-bold text-primary block mb-1">
                      💡 {currentStepData.tips[openTipIdx].label}:
                    </strong>
                    {currentStepData.tips[openTipIdx].content}
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  )
}
