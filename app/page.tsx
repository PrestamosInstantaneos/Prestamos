import { SiteHeader } from "@/components/site-header"
import { Hero } from "@/components/hero"
import { PendingLoansRibbon } from "@/components/pending-loans-ribbon"
import { HowItWorks } from "@/components/how-it-works"
import { LoanSimulator } from "@/components/loan-simulator"
import { LoanApplication } from "@/components/loan-application"
import { SiteFooter } from "@/components/site-footer"

export default function Page() {
  return (
    <main className="relative min-h-screen bg-background">
      <SiteHeader />
      <Hero />
      <PendingLoansRibbon />
      <HowItWorks />
      <LoanSimulator />
      <LoanApplication />
      <SiteFooter />
    </main>
  )
}
