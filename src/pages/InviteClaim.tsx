import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, GitBranch, Users } from 'lucide-react'
import { fetchInviteByToken, claimInvite, getInviteStatus } from '../hooks/useInvite'
import type { InviteWithJoins } from '../hooks/useInvite'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { EmailOTPForm } from '../components/ui/EmailOTPForm'
import { AnimatedOrbs } from '../components/ui/AnimatedOrbs'
import { LogoMark } from '../components/ui/LogoMark'

type PageState = 'loading' | 'invalid' | 'valid' | 'claimed'


function MemberAvatars({ names }: { names: string[] }) {
  const shown = names.slice(0, 4)
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((name, i) => (
        <div
          key={i}
          className="w-8 h-8 rounded-full border-2 border-ft-bg2 flex items-center justify-center text-[11px] font-bold text-white"
          style={{
            background: `linear-gradient(135deg, rgba(124,92,255,${0.8 - i * 0.15}), rgba(155,122,255,${0.7 - i * 0.15}))`,
            zIndex: shown.length - i,
          }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      ))}
      {names.length > 4 && (
        <div
          className="w-8 h-8 rounded-full border-2 border-ft-bg2 flex items-center justify-center text-[10px] font-bold text-ft-text3 bg-ft-bg4"
          style={{ zIndex: 0 }}
        >
          +{names.length - 4}
        </div>
      )}
    </div>
  )
}

export function InviteClaim() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const [pageState, setPageState] = useState<PageState>('loading')
  const [invite, setInvite] = useState<InviteWithJoins | null>(null)
  const [memberNames, setMemberNames] = useState<string[]>([])
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState('')

  useEffect(() => {
    if (!token) { setPageState('invalid'); return }

    fetchInviteByToken(token).then((inv) => {
      if (!inv) { setPageState('invalid'); return }

      const status = getInviteStatus(inv)
      if (status === 'expired') { setPageState('invalid'); return }

      // Already claimed by someone else
      if (inv.claimed_by && inv.claimed_by !== user?.id) {
        setPageState('invalid')
        return
      }

      // Already claimed by current user
      if (inv.claimed_by && inv.claimed_by === user?.id) {
        setInvite(inv)
        setPageState('claimed')
        return
      }

      setInvite(inv)
      setPageState('valid')
    })
  }, [token, user?.id])

  // Fetch member names for avatar preview
  useEffect(() => {
    if (!invite?.tree_id) return
    supabase
      .from('members')
      .select('name')
      .eq('tree_id', invite.tree_id)
      .limit(8)
      .then(({ data }) => {
        setMemberNames((data ?? []).map((m: { name: string }) => m.name))
      })
  }, [invite?.tree_id])

  async function handleClaim(userId: string) {
    if (!invite) return
    setClaiming(true)
    setClaimError('')
    try {
      await claimInvite(invite, userId)
      navigate(`/tree/${invite.tree_id}?newMember=true`)
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Failed to join tree')
      setClaiming(false)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-ft-bg flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-ft-v500 border-t-transparent animate-spin" />
      </div>
    )
  }

  // ── Invalid / expired ──────────────────────────────────────────────────────
  if (pageState === 'invalid') {
    return (
      <div className="min-h-screen bg-ft-bg flex items-center justify-center px-4 relative overflow-hidden">
        <AnimatedOrbs />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-sm card-glass p-8 text-center"
        >
          <div className="w-14 h-14 rounded-full bg-ft-rose/10 border border-ft-rose/20 flex items-center justify-center mx-auto mb-5">
            <AlertCircle size={26} className="text-ft-rose" />
          </div>
          <h1 className="font-display text-2xl font-bold text-ft-text mb-2">
            This link has expired
          </h1>
          <p className="text-ft-text2 text-sm leading-relaxed mb-6">
            The invite link is no longer valid. Ask the tree owner to send you a new one.
          </p>
          <button
            onClick={() => navigate('/')}
            className="border border-ft-border2 text-ft-v200 rounded-2xl px-8 py-3 hover:bg-ft-border hover:border-ft-border3 transition-all text-sm font-medium w-full"
          >
            Go to Family Trail
          </button>
        </motion.div>
      </div>
    )
  }

  // ── Already claimed by this user ───────────────────────────────────────────
  if (pageState === 'claimed' && invite) {
    return (
      <div className="min-h-screen bg-ft-bg flex items-center justify-center px-4 relative overflow-hidden">
        <AnimatedOrbs />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-sm card-glass p-8 text-center"
        >
          <div className="w-14 h-14 rounded-full bg-ft-teal/10 border border-ft-teal/20 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={26} className="text-ft-teal" />
          </div>
          <h1 className="font-display text-2xl font-bold text-ft-text mb-2">
            You've already joined this tree
          </h1>
          <p className="text-ft-text2 text-sm leading-relaxed mb-6">
            You're part of{' '}
            <span className="text-ft-v200">{invite.trees?.name ?? 'this family tree'}</span>.
            Open it to see everyone.
          </p>
          <button
            onClick={() => navigate(`/tree/${invite.tree_id}`)}
            className="bg-gradient-to-br from-ft-v500 to-ft-v400 text-white font-semibold rounded-2xl px-8 py-3 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(124,92,255,0.45)] transition-all w-full text-sm"
          >
            Open family tree
          </button>
        </motion.div>
      </div>
    )
  }

  // ── Valid invite ───────────────────────────────────────────────────────────
  if (pageState === 'valid' && invite) {
    const treeName = invite.trees?.name ?? 'family tree'
    const claimedMemberName = invite.members?.name ?? null

    return (
      <div className="min-h-screen bg-ft-bg flex items-center justify-center px-4 py-12 relative overflow-hidden">
        <AnimatedOrbs />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative z-10 w-full max-w-sm space-y-4"
        >
          {/* Logo */}
          <div className="flex items-center gap-2 justify-center mb-6">
            <LogoMark size={28} />
            <span className="font-display text-sm tracking-[0.25em] uppercase text-ft-text3">
              Family Trail
            </span>
          </div>

          {/* Tree preview card */}
          <div className="card-glass p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="bg-ft-bg4 p-2.5 rounded-xl text-ft-v400 shrink-0">
                <GitBranch size={20} />
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-2xl font-bold text-ft-text leading-tight">
                  {treeName}
                </h1>
                <p className="text-ft-text3 text-xs mt-0.5 font-medium">Family tree</p>
              </div>
            </div>

            {memberNames.length > 0 && (
              <div className="flex items-center gap-3 py-3 border-t border-ft-border">
                <MemberAvatars names={memberNames} />
                <div className="flex items-center gap-1.5 text-ft-text2 text-sm">
                  <Users size={13} className="text-ft-text3" />
                  <span>{memberNames.length} member{memberNames.length !== 1 ? 's' : ''} so far</span>
                </div>
              </div>
            )}

            {claimedMemberName && (
              <div className="mt-3 pt-3 border-t border-ft-border">
                <p className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium mb-2">
                  You're invited to join as
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ft-v500 to-ft-v400 flex items-center justify-center text-xs font-bold text-white">
                    {claimedMemberName.charAt(0).toUpperCase()}
                  </div>
                  <p className="font-display text-lg font-semibold text-ft-text">{claimedMemberName}</p>
                </div>
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-ft-border">
              <span className={`text-[10px] font-medium px-2 py-1 rounded-full uppercase tracking-wider ${
                invite.role === 'editor'
                  ? 'bg-ft-teal/10 text-ft-teal border border-ft-teal/20'
                  : 'bg-ft-gold/10 text-ft-gold border border-ft-gold/20'
              }`}>
                {invite.role} access
              </span>
            </div>
          </div>

          {/* Claim section */}
          <div className="card-glass p-6">
            {user ? (
              // Logged in — direct claim button
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium mb-1">
                    Signed in as
                  </p>
                  <p className="text-sm text-ft-text2">{user.email}</p>
                </div>

                {claimError && <p className="text-ft-rose text-xs">{claimError}</p>}

                <button
                  onClick={() => handleClaim(user.id)}
                  disabled={claiming}
                  className="bg-gradient-to-br from-ft-v500 to-ft-v400 text-white font-semibold rounded-2xl px-8 py-3.5 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(124,92,255,0.45)] transition-all w-full text-sm disabled:opacity-50 disabled:pointer-events-none"
                >
                  {claiming ? 'Joining…' : 'Claim this invite'}
                </button>
              </div>
            ) : (
              // Not logged in — show OTP form, claim after auth
              <div className="space-y-4">
                <div>
                  <h2 className="font-display text-lg font-semibold text-ft-text mb-1">
                    Sign in to claim your spot
                  </h2>
                  <p className="text-ft-text3 text-sm">
                    Create an account or sign in — we'll add you to the tree automatically.
                  </p>
                </div>

                {claimError && <p className="text-ft-rose text-xs">{claimError}</p>}

                <EmailOTPForm onSuccess={handleClaim} />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    )
  }

  return null
}
