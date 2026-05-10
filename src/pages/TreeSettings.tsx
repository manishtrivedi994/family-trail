import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Globe, Lock, Trash2, Users, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useToastStore } from '../store/toastStore'
import type { MemberRole, Tree, TreeVisibility } from '../types'

interface ContributorRow {
  user_id: string
  role: MemberRole
  display: string
}

const visibilityOptions: { value: TreeVisibility; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: 'private',  label: 'Private',          desc: 'Only people you invite can see this tree',  icon: <Lock size={16} /> },
  { value: 'shared',   label: 'Shared via link',   desc: 'Anyone with the invite link can join',      icon: <Users size={16} /> },
  { value: 'public',   label: 'Public',             desc: 'Anyone can view (but not edit)',            icon: <Globe size={16} /> },
]

export function TreeSettings() {
  const { treeId = '' } = useParams<{ treeId: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const addToast = useToastStore((s) => s.addToast)

  const [tree, setTree] = useState<Tree | null>(null)
  const [treeName, setTreeName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [contributors, setContributors] = useState<ContributorRow[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadTree()
    loadContributors()
  }, [treeId])

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus()
  }, [editingName])

  async function loadTree() {
    const { data } = await supabase.from('trees').select('*').eq('id', treeId).single()
    if (data) {
      setTree(data as Tree)
      setTreeName(data.name)
    }
  }

  async function loadContributors() {
    const { data: members } = await supabase
      .from('tree_members')
      .select('user_id, role')
      .eq('tree_id', treeId)
    if (!members) return

    const userIds = members.map((m) => m.user_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds)

    const profileMap = new Map((profiles ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p.display_name]))

    setContributors(
      members.map((m) => ({
        user_id: m.user_id,
        role: m.role as MemberRole,
        display: (profileMap.get(m.user_id) as string | null) ?? m.user_id.slice(0, 8) + '…',
      }))
    )
  }

  async function saveName() {
    setEditingName(false)
    const name = treeName.trim()
    if (!name || name === tree?.name) return
    const { error } = await supabase.from('trees').update({ name }).eq('id', treeId)
    if (error) {
      addToast('Failed to update tree name', 'error')
      setTreeName(tree?.name ?? '')
    } else {
      setTree((t) => t ? { ...t, name } : t)
      addToast('Tree name updated', 'success')
    }
  }

  async function updateVisibility(visibility: TreeVisibility) {
    setTree((t) => t ? { ...t, visibility } : t)
    const { error } = await supabase.from('trees').update({ visibility }).eq('id', treeId)
    if (error) addToast('Failed to update visibility', 'error')
    else addToast('Visibility updated', 'success')
  }

  async function updateRole(userId: string, role: MemberRole) {
    setContributors((prev) => prev.map((c) => c.user_id === userId ? { ...c, role } : c))
    const { error } = await supabase
      .from('tree_members')
      .update({ role })
      .eq('tree_id', treeId)
      .eq('user_id', userId)
    if (error) addToast('Failed to update role', 'error')
  }

  async function removeContributor(userId: string) {
    if (!confirm('Remove this contributor? They will lose access to the tree.')) return
    setContributors((prev) => prev.filter((c) => c.user_id !== userId))
    await supabase.from('tree_members').delete().eq('tree_id', treeId).eq('user_id', userId)
    addToast('Contributor removed', 'info')
  }

  async function handleDeleteTree() {
    if (!tree || deleteConfirm !== tree.name) return
    setDeleting(true)
    try {
      await supabase.from('trees').delete().eq('id', treeId)
      addToast('Tree deleted', 'info')
      navigate('/dashboard')
    } catch {
      addToast('Failed to delete tree', 'error')
      setDeleting(false)
    }
  }

  if (!tree) {
    return (
      <div className="min-h-screen bg-ft-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-ft-v500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ft-bg">
      <header className="sticky top-0 z-20 bg-ft-bg2/80 backdrop-blur border-b border-ft-border">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(`/tree/${treeId}`)}
            className="p-1.5 rounded-lg text-ft-text3 hover:text-ft-text hover:bg-ft-bg4 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft size={17} />
          </button>
          <span className="font-display text-base font-semibold text-ft-text">Tree settings</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* General */}
        <section className="bg-ft-bg3 border border-ft-border rounded-2xl p-5 space-y-4">
          <h2 className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium">General</h2>
          <div>
            <p className="text-xs text-ft-text3 mb-1.5">Tree name</p>
            {editingName ? (
              <input
                ref={nameInputRef}
                value={treeName}
                onChange={(e) => setTreeName(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveName()
                  if (e.key === 'Escape') { setEditingName(false); setTreeName(tree.name) }
                }}
                className="w-full bg-ft-bg4 border border-ft-border2 rounded-xl px-3 py-2 text-sm text-ft-text focus:outline-none focus:border-ft-v500"
              />
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="text-left w-full px-3 py-2 rounded-xl border border-ft-border hover:border-ft-border2 hover:bg-ft-bg4 transition-all text-sm text-ft-text"
              >
                {tree.name}
                <span className="ml-2 text-ft-text3 text-xs">(click to edit)</span>
              </button>
            )}
          </div>
        </section>

        {/* Visibility */}
        <section className="bg-ft-bg3 border border-ft-border rounded-2xl p-5 space-y-4">
          <h2 className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium">Visibility</h2>
          <div className="space-y-2">
            {visibilityOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateVisibility(opt.value)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                  tree.visibility === opt.value
                    ? 'bg-ft-bg4 border-ft-v500/60'
                    : 'border-ft-border hover:border-ft-border2 hover:bg-ft-bg4'
                }`}
              >
                <span className={tree.visibility === opt.value ? 'text-ft-v400' : 'text-ft-text3'}>
                  {opt.icon}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-ft-text font-medium">{opt.label}</p>
                  <p className="text-xs text-ft-text3 mt-0.5">{opt.desc}</p>
                </div>
                {tree.visibility === opt.value && (
                  <span className="w-4 h-4 rounded-full bg-ft-v500 flex items-center justify-center shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Contributors */}
        <section className="bg-ft-bg3 border border-ft-border rounded-2xl p-5 space-y-4">
          <h2 className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium">
            Contributors · {contributors.length}
          </h2>
          <div className="space-y-1">
            {contributors.map((c) => (
              <div key={c.user_id} className="flex items-center gap-3 py-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ft-v500 to-ft-v700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {c.display.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 text-sm text-ft-text2 truncate">
                  {c.display}
                  {c.user_id === user?.id && <span className="ml-1.5 text-ft-text3 text-xs">(you)</span>}
                </span>
                {c.user_id === user?.id || c.role === 'owner' ? (
                  <span className="text-xs text-ft-text3 px-2 py-1 rounded-lg border border-ft-border">{c.role}</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <select
                      value={c.role}
                      onChange={(e) => updateRole(c.user_id, e.target.value as MemberRole)}
                      className="bg-ft-bg4 border border-ft-border rounded-lg text-xs text-ft-text2 px-2 py-1 focus:outline-none focus:border-ft-border2"
                    >
                      <option value="editor">editor</option>
                      <option value="viewer">viewer</option>
                    </select>
                    <button
                      onClick={() => removeContributor(c.user_id)}
                      className="p-1.5 rounded-lg text-ft-text3 hover:text-ft-rose hover:bg-rose-950/30 transition-colors"
                      aria-label="Remove contributor"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Danger zone */}
        <section className="bg-ft-bg3 border border-rose-500/20 rounded-2xl p-5 space-y-4">
          <h2 className="text-[10px] uppercase tracking-widest text-rose-500/60 font-medium">Danger zone</h2>
          <p className="text-sm text-ft-text2 leading-relaxed">
            Permanently delete this tree and all its members, relationships, and invites. This cannot be undone.
          </p>
          <div>
            <p className="text-xs text-ft-text3 mb-2">
              Type <strong className="text-ft-text">{tree.name}</strong> to confirm
            </p>
            <input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={tree.name}
              className="w-full bg-ft-bg4 border border-ft-border rounded-xl px-3 py-2 text-sm text-ft-text focus:outline-none focus:border-rose-500/50 mb-3"
            />
            <button
              onClick={handleDeleteTree}
              disabled={deleteConfirm !== tree.name || deleting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-500/30 text-rose-400 text-sm font-medium hover:bg-rose-950/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 size={14} />
              {deleting ? 'Deleting…' : 'Delete tree'}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
