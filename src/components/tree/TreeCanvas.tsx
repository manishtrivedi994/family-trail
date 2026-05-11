import { useEffect, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Maximize2 } from 'lucide-react'
import { MemberNode } from './MemberNode'
import { RelationshipEdge } from './RelationshipEdge'
import { useToastStore } from '../../store/toastStore'
import type { MemberSide } from '../../types'

const nodeTypes = { memberNode: MemberNode }
const edgeTypes = { relationshipEdge: RelationshipEdge }

const NODE_W = 80
const NODE_H = 36

function AutoFitView({ trigger }: { trigger: number }) {
  const { fitView } = useReactFlow()
  const fitted = useRef(false)

  useEffect(() => {
    if (trigger > 0 && !fitted.current) {
      setTimeout(() => {
        fitView({ padding: 0.25, duration: 500 })
        fitted.current = true
      }, 50)
    }
  }, [trigger, fitView])

  return null
}

function FocusController({ focusMemberId }: { focusMemberId: string | null }) {
  const { setCenter, getNode } = useReactFlow()
  const handledRef = useRef<string | null>(null)

  useEffect(() => {
    if (!focusMemberId || focusMemberId === handledRef.current) return
    const timer = setTimeout(() => {
      const node = getNode(focusMemberId)
      if (node) {
        handledRef.current = focusMemberId
        setCenter(
          node.position.x + NODE_W,
          node.position.y + NODE_H,
          { zoom: 1.4, duration: 800 }
        )
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [focusMemberId, setCenter, getNode])

  return null
}

function FitViewButton() {
  const { fitView } = useReactFlow()

  return (
    <button
      onClick={() => fitView({ padding: 0.25, duration: 400 })}
      className="md:hidden absolute bottom-4 right-4 z-10 w-11 h-11 rounded-full bg-ft-bg3 border border-ft-border2 flex items-center justify-center text-ft-text2 hover:text-ft-text hover:border-ft-border3 transition-all shadow-lg"
      aria-label="Fit view"
    >
      <Maximize2 size={16} />
    </button>
  )
}

function ExportController({
  trigger,
  treeName,
  containerRef,
}: {
  trigger: number
  treeName: string
  containerRef: React.RefObject<HTMLDivElement | null>
}) {
  const { fitView } = useReactFlow()
  const addToast = useToastStore((s) => s.addToast)
  const prevTrigger = useRef(0)

  useEffect(() => {
    if (trigger === 0 || trigger === prevTrigger.current) return
    prevTrigger.current = trigger

    fitView({ padding: 0.1, duration: 300 })
    addToast('Exporting tree…', 'info')

    setTimeout(async () => {
      if (!containerRef.current) return
      try {
        const { toPng } = await import('html-to-image')
        const dataUrl = await toPng(containerRef.current, {
          backgroundColor: '#08060F',
          pixelRatio: 2,
        })
        const link = document.createElement('a')
        link.download = `${treeName.replace(/\s+/g, '_')}_family_tree.png`
        link.href = dataUrl
        link.click()
        addToast('Tree exported!', 'success')
      } catch {
        addToast('Export failed', 'error')
      }
    }, 350)
  }, [trigger, fitView, treeName, containerRef, addToast])

  return null
}

interface TreeCanvasProps {
  nodes: Node[]
  edges: Edge[]
  focusMemberId?: string | null
  exportTrigger?: number
  treeName?: string
  readOnly?: boolean
}

export function TreeCanvas({
  nodes: propNodes,
  edges: propEdges,
  focusMemberId = null,
  exportTrigger = 0,
  treeName = 'family_tree',
  readOnly = false,
}: TreeCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setNodes(propNodes)
  }, [propNodes, setNodes])

  useEffect(() => {
    setEdges(propEdges)
  }, [propEdges, setEdges])

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        minZoom={0.2}
        maxZoom={2.5}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        defaultEdgeOptions={{ type: 'relationshipEdge' }}
        proOptions={{ hideAttribution: true }}
        style={{ background: '#08060F' }}
      >
        <AutoFitView trigger={propNodes.length} />
        <FocusController focusMemberId={focusMemberId} />
        <ExportController trigger={exportTrigger} treeName={treeName} containerRef={containerRef} />
        <Background color="rgba(160,130,255,0.05)" gap={28} />
        <Controls
          style={{
            background: '#17132B',
            border: '1px solid rgba(160,130,255,0.12)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        />
        <MiniMap
          style={{
            background: '#100D1E',
            border: '1px solid rgba(160,130,255,0.12)',
            borderRadius: '12px',
          }}
          maskColor="rgba(8,6,15,0.7)"
          nodeColor={(n) => {
            const side = n.data?.side as MemberSide
            if (side === 'owner') return '#9B7AFF'
            if (side === 'spouse') return '#2DD4BF'
            if (side === 'child') return '#D4A843'
            if (side === 'ancestor') return 'rgba(155,122,255,0.5)'
            return 'rgba(160,130,255,0.3)'
          }}
        />
      </ReactFlow>
      <FitViewButton />
    </div>
  )
}
