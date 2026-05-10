import { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToastStore } from '../../store/toastStore'
import { compressImage } from '../../lib/imageUtils'

interface PhotoUploadProps {
  currentPhotoUrl: string | null
  memberId: string
  userId: string
  name: string
  onUploadComplete: (url: string) => void
}

export function PhotoUpload({ currentPhotoUrl, memberId, userId, name, onUploadComplete }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const addToast = useToastStore((s) => s.addToast)

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

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
      const path = `${userId}/${memberId}/${Date.now()}.jpg`
      const { error } = await supabase.storage
        .from('member-photos')
        .upload(path, compressed, { contentType: 'image/jpeg', upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('member-photos').getPublicUrl(path)
      onUploadComplete(publicUrl)
      addToast('Photo updated', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Upload failed', 'error')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative w-20 h-20 rounded-full overflow-hidden shrink-0 group focus:outline-none"
      >
        {currentPhotoUrl ? (
          <img
            src={currentPhotoUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-lg font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #7C5CFF, #9B7AFF)' }}
          >
            {initials}
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
          {uploading ? (
            <Loader2 size={18} className="text-white animate-spin" />
          ) : (
            <Camera size={18} className="text-white" />
          )}
        </div>

        {/* Upload progress ring */}
        {uploading && (
          <div className="absolute inset-0 rounded-full border-2 border-ft-v400 border-t-transparent animate-spin" />
        )}
      </button>

      <div>
        <p className="text-sm text-ft-text2 font-medium">Profile photo</p>
        <p className="text-xs text-ft-text3 mt-0.5">Click to upload · max 5MB</p>
        <p className="text-xs text-ft-text3">JPEG, PNG, WebP</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}
