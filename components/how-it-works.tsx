"use client"

import { useState, useEffect } from "react"
import { FileText, BadgeCheck, Wallet, Calculator } from "lucide-react"

export function HowItWorks() {
  const [user, setUser] = useState<{ nombres: string; apellidos: string; telefono: string } | null>(null)

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

  const steps = [
    {
      number: "01",
      icon: user ? Calculator : FileText,
      image: user ? "/images/step-1-logged.png" : "/images/step-1.png",
      title: user ? "Simula y solicita" : "Completa la solicitud",
      desc: user
        ? "Ya estás registrado. Ve al simulador, ajusta tu monto y cuotas, y solicita tu préstamo al instante."
        : "Llena el formulario en línea en menos de 5 minutos. Solo necesitas tus datos básicos.",
      actionText: user ? "IR AL SIMULADOR" : "COMENZAR",
      actionHref: user ? "#simulador" : "#solicitar"
    },
    {
      number: "02",
      icon: BadgeCheck,
      image: "/images/step-2.png",
      title: "Aprobación veloz",
      desc: "Analizamos tu solicitud al instante y te damos una respuesta sin esperas innecesarias.",
      actionText: "VERIFICAR",
      actionHref: "#solicitar"
    },
    {
      number: "03",
      icon: Wallet,
      image: "/images/step-3.png",
      title: "Recibe tu dinero",
      desc: "Una vez aprobado, transferimos el monto directamente a tu cuenta bancaria.",
      actionText: "SIMULAR",
      actionHref: "#simulador"
    },
  ]

  return (
    <section id="como-funciona" className="border-t border-border py-12 md:py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-4 text-xs font-semibold tracking-[0.3em] text-primary">
            PROCESO SIMPLE
          </p>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground text-balance sm:text-3xl md:text-4xl">
            Tu préstamo en 3 pasos
          </h2>
        </div>

        {/* Desplazamiento horizontal en móviles (deslizar a un lado) y grilla en pantallas grandes */}
        <div className="mt-8 md:mt-14 flex overflow-x-auto md:grid md:grid-cols-3 gap-6 pb-6 md:pb-0 snap-x snap-mandatory scrollbar-none scroll-smooth max-w-full">
          {steps.map((step) => (
            <div
              key={step.title}
              className="w-[280px] shrink-0 snap-center md:w-auto md:shrink group relative rounded-2xl border border-border/80 bg-card/20 backdrop-blur-md p-6 sm:p-8 transition-all duration-500 hover:scale-[1.03] hover:-translate-y-1 hover:border-primary/50 hover:bg-card/40 flex flex-col justify-between min-h-[420px] aspect-[3/4.2] shadow-xl hover:shadow-2xl hover:shadow-primary/5"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold tracking-wider text-primary">
                    {step.number}
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <step.icon className="h-4.5 w-4.5 text-primary" />
                  </span>
                </div>
                
                {/* Ilustración circular integrada */}
                <div className="my-4 flex justify-center">
                  <div className="relative h-28 w-28 rounded-full overflow-hidden border border-border/40 bg-background/50 shadow-inner flex items-center justify-center">
                    <img
                      src={step.image}
                      alt={step.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                </div>

                <h3 className="font-heading text-base font-bold text-foreground text-center group-hover:text-primary transition-colors">
                  {step.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground text-center text-pretty">
                  {step.desc}
                </p>
              </div>
              
              {/* Botón rectangular al pie de la tarjeta */}
              <div className="mt-6">
                <a
                  href={step.actionHref}
                  className="block w-full rounded bg-primary py-2.5 text-center text-xs font-bold tracking-widest text-primary-foreground transition-opacity hover:opacity-90 uppercase"
                >
                  {step.actionText}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

