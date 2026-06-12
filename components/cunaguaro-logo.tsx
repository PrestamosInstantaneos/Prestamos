import { cn } from "@/lib/utils"

export function CunaguaroLogo({ className }: { className?: string }) {
  return (
    <img
      src="/cunaguarologo.png"
      alt="ResuelveYa! Logo"
      className={cn("object-contain rounded-full", className)}
    />
  )
}
