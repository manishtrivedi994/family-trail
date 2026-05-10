import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Pencil, Network, Camera, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Member, MemberSide } from '../../types'
import { supabase } from '../../lib/supabase'
import { useToastStore } from '../../store/toastStore'
import { compressImage } from '../../lib/imageUtils'

const bannerGradients: Record<MemberSide, string> = {
  owner:    'linear-gradient(135deg, #1A1040 0%, #2E1A6E 50%, #1A2840 100%)',
  ancestor: 'linear-gradient(135deg, #1A1040 0%, #2E1A6E 50%, #1A2840 100%)',
  spouse:   'linear-gradient(135deg, #0A2420 0%, #0F4A3C 50%, #0A2440 100%)',
  child:    'linear-gradient(135deg, #2A1A00 0%, #4A3000 50%, #1A2000 100%)',
  unknown:  'linear-gradient(135deg, #12101E 0%, #1F1A38 50%, #12101E 100%)',
}

const avatarGradients: Record<MemberSide, string> = {
  owner:    'linear-gradient(135deg, #7C5CFF, #9B7AFF)',
  ancestor: 'linear-gradient(135deg, #4B30B8, #6344E0)',
  spouse:   'linear-gradient(135deg, #1BA090, #2DD4BF)',
  child:    'linear-gradient(135deg, #92730A, #D4A843)',
  unknown:  'linear-gradient(135deg, #4B30B8, #7C5CFF)',
}

const orbColors: Record<MemberSide, string> = {
  owner:    '#7C5CFF',
  ancestor: '#7C5CFF',
  spouse:   '#2DD4BF',
  child:    '#D4A843',
  unknown:  '#7C5CFF',
}

const sideLabels: Record<MemberSide, string> = {
  owner:    'Owner · your profile',
  ancestor: 'Ancestor',
  spouse:   "Spouse's side",
  child:    'Child',
  unknown:  'Relative',
}

interface ProfileHeaderProps {
  member: Member
  side: MemberSide
  treeId: string
  onEdit: () => void
  canEdit?: boolean
  userId?: string
  onPhotoUploaded?: (url: string) => void
}

export function ProfileHeader({ member, side, treeId, onEdit, canEdit = false, userId, onPhotoUploaded }: ProfileHeaderProps) {
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const initials = member.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const orbColor = orbColors[side]

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    
    if (!file.type.startsWith('image/')) {
      addToast('Please select an image file', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('Photo upload failed — max 5MB', 'error')
      return
    }

    setUploading(true)
    try {
      const compressed = await compressImage(file)
      const path = `${userId}/${member.id}/${Date.now()}.jpg`
      const { error } = await supabase.storage
        .from('member-photos')
        .upload(path, compressed, { contentType: 'image/jpeg', upsert: true })
      
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('member-photos').getPublicUrl(path)
      
      if (onPhotoUploaded) {
        onPhotoUploaded(publicUrl)
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Upload failed', 'error')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const avatarContent = member.photo_url ? (
    <img
      src={member.photo_url}
      alt={member.name}
      className="w-20 h-20 rounded-full object-cover border-4 border-ft-bg shrink-0"
    />
  ) : (
    <div
      className="w-20 h-20 rounded-full border-4 border-ft-bg flex items-center justify-center text-xl font-bold text-white shrink-0"
      style={{ background: avatarGradients[side] }}
    >
      {initials}
    </div>
  )

  return (
    <div>
      {/* Banner */}
      <div
        className="relative h-[100px] overflow-hidden"
        style={{ background: bannerGradients[side] }}
      >
        <motion.div
          className="absolute -top-8 -left-8 w-32 h-32 rounded-full opacity-30"
          style={{ background: `radial-gradient(circle, ${orbColor}, transparent)` }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-6 right-8 w-24 h-24 rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${orbColor}, transparent)` }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
      </div>

      {/* Avatar + actions */}
      <div className="px-5 pb-4">
        <div className="relative z-10 flex items-end justify-between -mt-10 mb-4">
          <div className="relative group shrink-0">
            {canEdit ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="block relative rounded-full overflow-hidden focus:outline-none disabled:opacity-100"
                title="Click to update photo"
              >
                {avatarContent}
                {/* Hover state */}
                <div className="absolute inset-0 rounded-full bg-black/50 border-4 border-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploading ? (
                    <Loader2 size={18} className="text-white animate-spin" />
                  ) : (
                    <Camera size={18} className="text-white" />
                  )}
                </div>
                {/* Loading state spinning overlay */}
                {uploading && (
                  <div className="absolute inset-0 rounded-full border-2 border-ft-v400 border-t-transparent animate-spin" />
                )}
              </button>
            ) : (
              avatarContent
            )}
            {canEdit && (
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
              />
            )}
          </div>

          <div className="flex gap-2 pb-1">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ft-border text-ft-text2 text-xs font-medium hover:bg-ft-bg4 hover:border-ft-border2 transition-all"
            >
              <Pencil size={13} />
              Edit
            </button>
            <button
              onClick={() => navigate(`/tree/${treeId}?focus=${member.id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ft-border text-ft-text2 text-xs font-medium hover:bg-ft-bg4 hover:border-ft-border2 transition-all"
            >
              <Network size={13} />
              View in tree
            </button>
          </div>
        </div>

        <h1 className="font-display text-3xl font-bold text-ft-text leading-tight">
          {member.name}
        </h1>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <p className="text-xs uppercase tracking-widest text-ft-text3">
            {sideLabels[side]}
          </p>
          {!member.is_living && (
            <span className="px-2 py-0.5 rounded-full bg-ft-bg4 border border-ft-border text-[10px] text-ft-text3">
              Deceased
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

