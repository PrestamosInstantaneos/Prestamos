"use client"

import { MessageSquare, Phone, ExternalLink } from "lucide-react"

export function ContactSection() {
  return (
    <section id="contacto" className="border-t border-border py-16 md:py-24 lg:py-28 bg-black/20 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none bg-[radial-gradient(circle,rgba(59,130,246,0.05),transparent_60%)]" />

      <div className="mx-auto max-w-4xl px-6 relative z-10">
        <div className="rounded-3xl border border-white/5 bg-card/35 backdrop-blur-xl p-8 md:p-12 shadow-2xl hover:border-white/10 transition-all duration-300 max-w-2xl mx-auto text-center space-y-6">
          
          <div className="flex justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/5 animate-pulse">
              <MessageSquare className="h-6 w-6" />
            </span>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold tracking-[0.3em] text-emerald-400 uppercase animate-pulse">
              Atención Directa
            </p>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              ¿Tienes dudas o necesitas ayuda?
            </h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              Nuestro equipo está a tu disposición para asesorarte. Contáctanos directamente a través de WhatsApp para recibir atención personalizada y aclarar cualquier inquietud técnica o comercial.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://wa.me/584241301804?text=Hola,%20deseo%20obtener%20más%20información%20sobre%20los%20préstamos%20en%20ResuelveYa."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-lg shadow-emerald-600/10 w-full sm:w-auto justify-center"
            >
              <span>Escríbenos por WhatsApp</span>
              <ExternalLink className="h-4 w-4" />
            </a>

            <div className="flex items-center gap-2 text-xs text-muted-foreground px-4 py-3 border border-white/5 bg-white/5 rounded-xl">
              <Phone className="h-4 w-4 text-emerald-400" />
              <span className="font-semibold select-all">+58 424-1301804</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
