import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Pencil, Network } from 'lucide-react'
import { useMember } from '../hooks/useMember'
import { useTree } from '../hooks/useTree'
import { usePermissions } from '../hooks/usePermissions'
import { useTreeStore } from '../store/treeStore'
import { useAuthStore } from '../store/authStore'
import { useToastStore } from '../store/toastStore'
import { supabase } from '../lib/supabase'
import { getSideMap } from '../lib/treeUtils'
import { ProfileHeader } from '../components/profile/ProfileHeader'
import { ProfileFields } from '../components/profile/ProfileFields'
import { ConnectionsGrid } from '../components/profile/ConnectionsGrid'
import { MemberFormModal } from '../components/tree/MemberFormModal'
import type { MemberSide } from '../types'

export function MemberPage() {
  const { treeId = '', memberId = '' } = useParams<{ treeId: string; memberId: string }>()
  const navigate = useNavigate()
  const [showEdit, setShowEdit] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useTree(treeId)
  const { canEdit } = usePermissions()
  const addToast = useToastStore((s) => s.addToast)

  const { member, relationships, connections, loading, error } = useMember(treeId, memberId, refreshKey)

  const user = useAuthStore((s) => s.user)
  const storeMembers = useTreeStore((s) => s.members)
  const storeRels = useTreeStore((s) => s.relationships)
  const storeTree = useTreeStore((s) => s.tree)

  const ownerMemberId = useMemo(
    () => storeMembers.find((m) => m.user_id === user?.id)?.id ?? '',
    [storeMembers, user?.id]
  )

  const side = useMemo((): MemberSide => {
    if (!memberId) return 'unknown'
    if (storeTree?.id === treeId && storeMembers.length > 0) {
      const sideMap = getSideMap(storeMembers, storeRels, ownerMemberId)
      return sideMap[memberId] ?? 'unknown'
    }
    if (member?.user_id === user?.id) return 'owner'
    return 'unknown'
  }, [memberId, storeTree?.id, treeId, storeMembers, storeRels, ownerMemberId, member, user?.id])

  const treeName = storeTree?.name ?? 'Family Tree'
  const ownerMember = storeMembers.find((m) => m.user_id === user?.id) ?? null

  function handleEditClose() {
    setShowEdit(false)
    setRefreshKey((k) => k + 1)
  }

  async function handlePhotoUploaded(url: string) {
    if (!member) return
    try {
      const { error } = await supabase
        .from('members')
        .update({ photo_url: url })
        .eq('id', member.id)
      if (error) throw error
      addToast('Profile photo updated', 'success')
      setRefreshKey((k) => k + 1)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update database', 'error')
    }
  }

  return (
    <motion.div
      className="min-h-screen bg-ft-bg"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-ft-bg2/90 backdrop-blur border-b border-ft-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(`/tree/${treeId}`)}
            className="p-1.5 rounded-lg text-ft-text3 hover:text-ft-text hover:bg-ft-bg4 transition-colors"
            aria-label="Back to tree"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-ft-text3 truncate">{treeName}</p>
            <p className="font-display text-base font-semibold text-ft-text truncate leading-tight">
              {member?.name ?? '…'}
            </p>
          </div>
          {member && canEdit && (
            <button
              onClick={() => setShowEdit(true)}
              className="p-2 rounded-xl text-ft-text3 hover:text-ft-text hover:bg-ft-bg4 transition-colors"
              aria-label="Edit member"
            >
              <Pencil size={15} />
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 pb-24 pt-6">
        {loading && (
          <div className="flex justify-center mt-24">
            <div className="w-8 h-8 rounded-full border-2 border-ft-v400 border-t-transparent animate-spin" />
          </div>
        )}

        {error && (
          <p className="text-ft-rose text-sm text-center mt-16">{error}</p>
        )}

        {!loading && member && (
          <div className="space-y-5">
            {/* Profile card */}
            <div className="bg-ft-bg2 border border-ft-border rounded-2xl overflow-hidden">
              <ProfileHeader
                member={member}
                side={side}
                treeId={treeId}
                canEdit={canEdit}
                userId={user?.id}
                onPhotoUploaded={handlePhotoUploaded}
                onEdit={() => setShowEdit(true)}
              />
              <div className="px-5 pb-5 pt-3 border-t border-ft-border">
                <ProfileFields
                  member={member}
                  onSendInvite={() => alert('Invite system coming in Session 6')}
                />
              </div>
            </div>

            {/* Connections card */}
            <div className="bg-ft-bg2 border border-ft-border rounded-2xl p-5">
              <h2 className="font-display text-xl font-semibold text-ft-text mb-4">Connections</h2>
              <ConnectionsGrid
                connections={connections}
                relationships={relationships}
                memberId={memberId}
                treeId={treeId}
              />
            </div>
          </div>
        )}
      </main>

      {/* Floating View in tree button */}
      {member && (
        <button
          onClick={() => navigate(`/tree/${treeId}?focus=${member.id}`)}
          className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-br from-ft-v500 to-ft-v400 text-white text-sm font-semibold shadow-[0_8px_24px_rgba(124,92,255,0.45)] hover:-translate-y-0.5 transition-all"
        >
          <Network size={14} />
          View in tree
        </button>
      )}

      {showEdit && member && (
        <MemberFormModal
          treeId={treeId}
          ownerMemberId={ownerMember?.id ?? null}
          isFirstMember={false}
          member={member}
          onClose={handleEditClose}
        />
      )}
    </motion.div>
  )
}
