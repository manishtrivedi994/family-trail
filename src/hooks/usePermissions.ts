import { useTreeStore } from '../store/treeStore'

export function usePermissions() {
  const myRole = useTreeStore((s) => s.myRole)
  return {
    canEdit: myRole === 'owner' || myRole === 'editor',
    canDelete: myRole === 'owner',
    canInvite: myRole === 'owner' || myRole === 'editor',
    canChangeSettings: myRole === 'owner',
    isOwner: myRole === 'owner',
    isViewer: myRole === 'viewer',
  }
}
