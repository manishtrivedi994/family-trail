import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, Camera, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useToastStore } from '../store/toastStore'

interface Profile {
  display_name: string | null
  avatar_url: string | null
}

const NOTIF_KEYS = ['new_member', 'invite_accepted', 'birthday_reminders'] as const
type NotifKey = typeof NOTIF_KEYS[number]

const notifLabels: Record<NotifKey, string> = {
  new_member: 'New member added',
  invite_accepted: 'Invite accepted',
  birthday_reminders: 'Birthday reminders',
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-10 rounded-full transition-colors shrink-0 ${on ? 'bg-ft-v500' : 'bg-ft-bg4 border border-ft-border'}`}
      style={{ height: '22px' }}
      aria-checked={on}
      role="switch"
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
        style={{ transform: on ? 'translateX(20px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

export function AccountSettings() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { signOut } = useAuthStore()
  const addToast = useToastStore((s) => s.addToast)

  const [profile, setProfile] = useState<Profile>({ display_name: null, avatar_url: null })
  const [displayName, setDisplayName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [notifications, setNotifications] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('ft_notif_prefs') ?? '{}') }
    catch { return {} }
  })

  const nameRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile(data as Profile)
          setDisplayName((data as Profile).display_name ?? '')
        }
      })
  }, [user])

  useEffect(() => {
    if (editingName) nameRef.current?.focus()
  }, [editingName])

  async function saveName() {
    setEditingName(false)
    if (!user) return
    const name = displayName.trim()
    await supabase
      .from('profiles')
      .upsert({ id: user.id, display_name: name || null, updated_at: new Date().toISOString() })
    setProfile((p) => ({ ...p, display_name: name || null }))
    addToast('Profile updated', 'success')
  }

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (!file.type.startsWith('image/')) { addToast('Please select an image', 'error'); return }
    if (file.size > 5 * 1024 * 1024) { addToast('Max 5MB', 'error'); return }

    setUploading(true)
    try {
      const path = `${user.id}/avatar.jpg`
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('profiles').upsert({ id: user.id, avatar_url: publicUrl, updated_at: new Date().toISOString() })
      setProfile((p) => ({ ...p, avatar_url: publicUrl }))
      addToast('Avatar updated', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Upload failed', 'error')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function toggleNotif(key: NotifKey) {
    setNotifications((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem('ft_notif_prefs', JSON.stringify(next))
      return next
    })
  }

  const initials = (user?.email ?? 'U').charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-ft-bg">
      <header className="sticky top-0 z-20 bg-ft-bg2/80 backdrop-blur border-b border-ft-border">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-1.5 rounded-lg text-ft-text3 hover:text-ft-text hover:bg-ft-bg4 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft size={17} />
          </button>
          <span className="font-display text-base font-semibold text-ft-text">Account settings</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Profile */}
        <section className="bg-ft-bg3 border border-ft-border rounded-2xl p-5 space-y-5">
          <h2 className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium">Profile</h2>

          <div className="flex items-center gap-4">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="relative w-16 h-16 rounded-full overflow-hidden group shrink-0 focus:outline-none"
            >
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ background: 'linear-gradient(135deg, #7C5CFF, #9B7AFF)' }}
                >
                  {initials}
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploading ? <Loader2 size={16} className="text-white animate-spin" /> : <Camera size={16} className="text-white" />}
              </div>
            </button>
            <div>
              <p className="text-sm text-ft-text font-medium">{user?.email}</p>
              <p className="text-xs text-ft-text3 mt-0.5">Click avatar to change · max 5MB</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
          </div>

          <div>
            <p className="text-xs text-ft-text3 mb-1.5">Display name</p>
            {editingName ? (
              <input
                ref={nameRef}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveName()
                  if (e.key === 'Escape') { setEditingName(false); setDisplayName(profile.display_name ?? '') }
                }}
                placeholder="Your name"
                className="w-full bg-ft-bg4 border border-ft-border2 rounded-xl px-3 py-2 text-sm text-ft-text focus:outline-none focus:border-ft-v500"
              />
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="text-left w-full px-3 py-2 rounded-xl border border-ft-border hover:border-ft-border2 hover:bg-ft-bg4 transition-all text-sm text-ft-text"
              >
                {profile.display_name
                  ? profile.display_name
                  : <span className="text-ft-text3">Not set</span>
                }
                <span className="ml-2 text-ft-text3 text-xs">(click to edit)</span>
              </button>
            )}
          </div>
        </section>

        {/* Notifications */}
        <section className="bg-ft-bg3 border border-ft-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Bell size={13} className="text-ft-text3" />
            <h2 className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium">Notifications</h2>
            <span className="ml-auto text-[10px] text-ft-text3">Stored locally</span>
          </div>
          {NOTIF_KEYS.map((key) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-ft-text2">{notifLabels[key]}</span>
              <Toggle on={!!notifications[key]} onToggle={() => toggleNotif(key)} />
            </div>
          ))}
        </section>

        {/* Account */}
        <section className="bg-ft-bg3 border border-ft-border rounded-2xl p-5 space-y-4">
          <h2 className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium">Account</h2>
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-ft-border text-ft-text2 text-sm font-medium hover:bg-ft-bg4 transition-colors"
          >
            Sign out
          </button>
          <p className="text-xs text-ft-text3 text-center">
            To delete your account, contact{' '}
            <span className="text-ft-v400">support@familytrail.app</span>
          </p>
        </section>
      </div>
    </div>
  )
}
