import { CalendarDays, MapPin, Briefcase, FileText, AlertCircle } from 'lucide-react'
import { differenceInYears, parseISO, format } from 'date-fns'
import type { Member } from '../../types'

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ft-v500/20 to-ft-v400/10 border border-ft-border2 flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium">{label}</p>
        <div className="text-sm font-medium text-ft-text mt-0.5">{value}</div>
      </div>
    </div>
  )
}

interface ProfileFieldsProps {
  member: Member
  onSendInvite?: () => void
}

export function ProfileFields({ member, onSendInvite }: ProfileFieldsProps) {
  const hasAnyField = member.dob || member.dod || member.location || member.occupation || member.bio

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {member.user_id ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ft-teal/10 border border-ft-teal/20 text-ft-teal text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-ft-teal" />
            Account linked
          </span>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ft-gold/10 border border-ft-gold/20 text-ft-gold text-[11px] font-medium">
              <AlertCircle size={11} />
              Not yet joined
            </span>
            {onSendInvite && (
              <button
                onClick={onSendInvite}
                className="px-2.5 py-1 rounded-full border border-ft-border text-ft-text2 text-[11px] font-medium hover:bg-ft-bg4 transition-colors"
              >
                Send invite
              </button>
            )}
          </>
        )}
      </div>

      {hasAnyField && (
        <div className="space-y-3.5">
          {member.dob && (
            <InfoRow
              icon={<CalendarDays size={14} className="text-ft-v400" />}
              label="Date of birth"
              value={
                <span>
                  {format(parseISO(member.dob), 'MMMM d, yyyy')}
                  {member.is_living && (
                    <span className="ml-2 text-ft-text2 font-normal">
                      (age {differenceInYears(new Date(), parseISO(member.dob))})
                    </span>
                  )}
                </span>
              }
            />
          )}

          {member.dod && (
            <InfoRow
              icon={<CalendarDays size={14} className="text-ft-text3" />}
              label="Date of passing"
              value={format(parseISO(member.dod), 'MMMM d, yyyy')}
            />
          )}

          {member.location && (
            <InfoRow
              icon={<MapPin size={14} className="text-ft-v400" />}
              label="Location"
              value={member.location}
            />
          )}

          {member.occupation && (
            <InfoRow
              icon={<Briefcase size={14} className="text-ft-v400" />}
              label="Occupation"
              value={member.occupation}
            />
          )}

          {member.bio && (
            <InfoRow
              icon={<FileText size={14} className="text-ft-v400" />}
              label="About"
              value={
                <span className="text-ft-text2 font-normal leading-relaxed whitespace-pre-wrap">
                  {member.bio}
                </span>
              }
            />
          )}
        </div>
      )}
    </div>
  )
}
