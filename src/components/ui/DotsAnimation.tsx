import { cn } from '@/lib/utils'

interface Props {
  color?: string
  size?: 'sm' | 'md'
  className?: string
}

const sizeMap = { sm: 'w-1.5 h-1.5', md: 'w-2 h-2' }

export function DotsAnimation({ color = 'var(--color-bot)', size = 'md', className }: Props) {
  return (
    <span className={cn('flex items-center gap-1', className)}>
      <span
        className={cn(sizeMap[size], 'rounded-full opacity-60')}
        style={{ backgroundColor: color, animation: 'thinking-dot 1.4s ease-in-out infinite' }}
      />
      <span
        className={cn(sizeMap[size], 'rounded-full opacity-60')}
        style={{ backgroundColor: color, animation: 'thinking-dot 1.4s ease-in-out 0.2s infinite' }}
      />
      <span
        className={cn(sizeMap[size], 'rounded-full opacity-60')}
        style={{ backgroundColor: color, animation: 'thinking-dot 1.4s ease-in-out 0.4s infinite' }}
      />
    </span>
  )
}
