import { FileText, BadgeCheck, Wallet } from "lucide-react"

const steps = [
  {
    number: "01",
    icon: FileText,
    title: "Completa la solicitud",
    desc: "Llena el formulario en línea en menos de 5 minutos. Solo necesitas tus datos básicos.",
    actionText: "COMENZAR",
    actionHref: "#solicitar"
  },
  {
    number: "02",
    icon: BadgeCheck,
    title: "Aprobación veloz",
    desc: "Analizamos tu solicitud al instante y te damos una respuesta sin esperas innecesarias.",
    actionText: "VERIFICAR",
    actionHref: "#solicitar"
  },
  {
    number: "03",
    icon: Wallet,
    title: "Recibe tu dinero",
    desc: "Una vez aprobado, transferimos el monto directamente a tu cuenta bancaria.",
    actionText: "SIMULAR CUOTA",
    actionHref: "#simulador"
  },
]

export function HowItWorks() {
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

        <div className="mt-8 md:mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.title}
              className="group relative rounded-2xl border border-border/80 bg-card/20 backdrop-blur-md p-6 sm:p-8 transition-all duration-300 hover:border-primary/50 hover:bg-card/40 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="font-mono text-sm font-bold tracking-wider text-primary">
                    {step.number}
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <step.icon className="h-5 w-5 text-primary" />
                  </span>
                </div>
                <h3 className="font-heading text-base font-bold text-foreground sm:text-lg">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {step.desc}
                </p>
              </div>
              
              <div className="mt-6 pt-4 border-t border-border/40">
                <a
                  href={step.actionHref}
                  className="inline-flex items-center text-xs font-semibold tracking-widest text-primary hover:text-primary/80 transition-colors uppercase gap-1"
                >
                  {step.actionText} <span className="transition-transform group-hover:translate-x-1 flex">→</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
