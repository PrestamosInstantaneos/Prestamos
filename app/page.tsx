import { SiteHeader } from "@/components/site-header"
import { Hero } from "@/components/hero"
import { PendingLoansRibbon } from "@/components/pending-loans-ribbon"
import { HowItWorks } from "@/components/how-it-works"
import { HowToRequestFlow } from "@/components/how-to-request-flow"
import { LevelsTicker } from "@/components/levels-ticker"
import { LoanSimulator } from "@/components/loan-simulator"
import { LoanHistory } from "@/components/loan-history"
import { LoanApplication } from "@/components/loan-application"
import { FAQSection } from "@/components/faq-section"
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
      <LevelsTicker />
      <LoanSimulator />
      <LoanHistory />
      <LoanApplication />
      <FAQSection />
      <HowToRequestFlow />
      <ContactSection />
      <SiteFooter />
    </main>
  )
}
