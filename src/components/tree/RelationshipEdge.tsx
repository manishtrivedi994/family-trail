import { getBezierPath, BaseEdge, type EdgeProps } from '@xyflow/react'

export function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const relType = (data as { relType?: string })?.relType

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  const strokeColor =
    relType === 'spouse_of'
      ? 'rgba(255,255,255,0.28)'
      : relType === 'sibling_of'
      ? 'rgba(155,122,255,0.45)'
      : 'rgba(155,122,255,0.65)'

  const strokeDasharray =
    relType === 'spouse_of' ? '5 4' : relType === 'sibling_of' ? '2 3' : undefined

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: strokeColor,
        strokeWidth: 1.5,
        strokeDasharray,
      }}
    />
  )
}
