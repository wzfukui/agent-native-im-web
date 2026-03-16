import { EntityAvatar } from '@/components/entity/EntityAvatar'
import { DotsAnimation } from '@/components/ui/DotsAnimation'
import { entityDisplayName } from '@/lib/utils'
import type { Entity } from '@/lib/types'

interface Props {
  entity?: Entity
}

export function ThinkingBubble({ entity }: Props) {
  return (
    <div className="flex gap-2.5 max-w-[85%]" style={{ animation: 'slide-up 0.2s cubic-bezier(0.16,1,0.3,1)' }}>
      <EntityAvatar entity={entity} size="sm" className="mt-0.5" />

      <div className="space-y-0.5 flex flex-col items-start">
        {entity && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-[11px] font-medium text-[var(--color-bot)]">
              {entityDisplayName(entity)}
            </span>
          </div>
        )}

        <div className="rounded-2xl rounded-tl-md bg-[var(--color-bubble-other)] border border-[var(--color-border-subtle)] px-4 py-3">
          <DotsAnimation />
        </div>
      </div>
    </div>
  )
}
