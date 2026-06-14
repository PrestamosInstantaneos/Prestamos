import { SiteHeader } from "@/components/site-header"
import { Hero } from "@/components/hero"
import { PendingLoansRibbon } from "@/components/pending-loans-ribbon"
import { HowItWorks } from "@/components/how-it-works"
import { LoanSimulator } from "@/components/loan-simulator"
import { LoanHistory } from "@/components/loan-history"
import { LoanApplication } from "@/components/loan-application"
import { ContactSection } from "@/components/contact-section"
import { SiteFooter } from "@/components/site-footer"

export default function Page() {
  // Despliegue de producción post-rollback
  return (

    <main className="relative min-h-screen bg-background">
      <SiteHeader />
      <Hero />
      <PendingLoansRibbon />
      <HowItWorks />
      <LoanSimulator />
      <LoanHistory />
      <LoanApplication />
      <ContactSection />
      <SiteFooter />
    </main>
  )
}
