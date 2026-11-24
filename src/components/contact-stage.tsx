import { StageBadge, STAGE_LABELS } from "@/components/stage-badge"
import { Button } from "@/components/ui/button"
import type { Stage } from "@/services/contact-service"

type ContactStageProps = {
  stage: Stage
  isClient: boolean
  nextStage: Stage | null
  action: () => Promise<void>
}

export function ContactStage({ stage, isClient, nextStage, action }: ContactStageProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <StageBadge stage={stage} isClient={isClient} />
      {nextStage && (
        <form action={action}>
          <Button type="submit" variant="outline" size="sm">
            Étape suivante · {STAGE_LABELS[nextStage]}
          </Button>
        </form>
      )}
    </div>
  )
}
