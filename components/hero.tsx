import Image from "next/image"
import { ArrowRight } from "lucide-react"

export function Hero() {
  return (
    <section id="inicio" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-12 pt-28 sm:px-6 lg:grid-cols-2 lg:gap-6 lg:px-10 lg:pb-24 lg:pt-40">
        {/* Left column */}
        <div className="relative z-10 flex flex-col items-center text-center lg:items-start lg:text-left">
          <p className="mb-5 text-xs font-semibold tracking-[0.3em] text-primary">
            PRÉSTAMOS 100% FLEXIBLES
          </p>
          <h1 className="font-heading text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground text-balance sm:text-6xl lg:text-7xl">
            Tu préstamo,
            <br />
            al instante
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground text-pretty">
            Solicita el dinero que necesitas en minutos. Aprobación rápida,
            tasas competitivas y desembolso directo a tu cuenta sin papeleo
            interminable.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
            <a
              href="#solicitar"
              className="group inline-flex items-center gap-2 rounded-md bg-primary px-8 py-4 text-sm font-semibold tracking-widest text-primary-foreground transition-opacity hover:opacity-90"
            >
              SOLICITAR AHORA
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#simulador"
              className="inline-flex items-center gap-2 rounded-md border border-border px-8 py-4 text-sm font-semibold tracking-widest text-foreground transition-colors hover:bg-secondary"
            >
              SIMULAR CUOTA
            </a>
          </div>
        </div>

        {/* Right column - image */}
        <div className="relative mx-auto w-full max-w-xs sm:max-w-md lg:max-w-none">
          <div className="pointer-events-none absolute -inset-10 z-0 rounded-full bg-primary/10 blur-3xl" />
          <Image
            src="/images/hero-finance.png"
            alt="Tarjeta de crédito rosa con monedas doradas"
            width={760}
            height={760}
            priority
            className="relative z-10 h-auto w-full object-contain"
          />
        </div>
      </div>
    </section>
  )
}
