import { useMemo } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { useTree } from '../hooks/useTree'
import { useTreeStore } from '../store/treeStore'
import { buildFlowGraph } from '../lib/treeUtils'
import { TreeCanvas } from '../components/tree/TreeCanvas'
import { MemberSidebar } from '../components/tree/MemberSidebar'
import { DemoBanner } from '../components/demo/DemoBanner'
import { DemoToolbar } from '../components/demo/DemoToolbar'
import { DEMO_TREE_ID, DEMO_OWNER_NODE_ID } from '../lib/demo'
import type { MemberSide } from '../types'

function DemoLoadingScreen() {
  return (
    <div className="flex flex-col h-screen bg-ft-bg items-center justify-center gap-4">
      <div className="w-10 h-10 rounded-full border-2 border-ft-v500/40 border-t-ft-v500 animate-spin" />
      <p className="text-ft-text3 text-sm">Loading the Sharma–Mehta family…</p>
    </div>
  )
}

export function DemoTreeView() {
  useTree(DEMO_TREE_ID)

  const loading = useTreeStore((s) => s.loading)
  const members = useTreeStore((s) => s.members)
  const relationships = useTreeStore((s) => s.relationships)

  const { nodes, edges } = useMemo(
    () => buildFlowGraph(members, relationships, DEMO_OWNER_NODE_ID),
    [members, relationships],
  )

  const sideMap = useMemo(() => {
    const m: Record<string, MemberSide> = {}
    nodes.forEach((n) => { m[n.id] = (n.data as { side: MemberSide }).side })
    return m
  }, [nodes])

  if (loading) return <DemoLoadingScreen />

  return (
    <div className="flex flex-col h-screen bg-ft-bg overflow-hidden">
      <DemoToolbar />
      <DemoBanner />
      <div className="flex-1 relative overflow-hidden">
        <ReactFlowProvider>
          <TreeCanvas
            nodes={nodes}
            edges={edges}
            readOnly={true}
          />
          <MemberSidebar
            sideMap={sideMap}
            treeId={DEMO_TREE_ID}
            myMemberId={null}
            readOnly={true}
            onEdit={() => {}}
            onAddConnection={() => {}}
            onInvite={() => {}}
            onAddRelative={() => {}}
          />
        </ReactFlowProvider>
      </div>
    </div>
  )
}
