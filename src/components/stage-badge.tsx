import { Badge } from "@/components/ui/badge"
import type { Stage } from "@/services/contact-service"

export const STAGE_LABELS: Record<Stage, string> = {
  premier_contact: "Premier contact",
  degustation: "Dégustation",
  commande: "Commande",
}

const STAGE_VARIANTS = {
  premier_contact: "outline",
  degustation: "secondary",
  commande: "default",
} as const satisfies Record<Stage, string>

type StageBadgeProps = {
  stage: Stage
  isClient: boolean
}

export function StageBadge({ stage, isClient }: StageBadgeProps) {
  return (
    <span className="flex flex-wrap gap-2">
      <Badge variant={STAGE_VARIANTS[stage]}>{STAGE_LABELS[stage]}</Badge>
      {isClient && <Badge className="bg-accent text-accent-foreground">Client</Badge>}
    </span>
  )
}
