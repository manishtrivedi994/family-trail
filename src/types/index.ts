export type TreeVisibility = 'private' | 'shared' | 'public'
export type MemberRole = 'owner' | 'editor' | 'viewer'
export type RelationshipType = 'parent_of' | 'spouse_of' | 'sibling_of'
export type MemberSide = 'owner' | 'ancestor' | 'spouse' | 'child' | 'unknown'

export interface Tree {
  id: string
  name: string
  owner_id: string
  visibility: TreeVisibility
  created_at: string
  member_count?: number
  my_role?: MemberRole
}

export interface Member {
  id: string
  tree_id: string
  user_id: string | null
  name: string
  gender: 'male' | 'female' | 'other' | null
  dob: string | null
  dod: string | null
  photo_url: string | null
  bio: string | null
  occupation: string | null
  location: string | null
  is_living: boolean
  created_by: string
  created_at: string
}

export interface Relationship {
  id: string
  tree_id: string
  from_id: string
  to_id: string
  type: RelationshipType
  created_at: string
}

export interface Invite {
  id: string
  tree_id: string
  member_id: string | null
  token: string
  role: MemberRole
  created_by: string
  expires_at: string | null
  claimed_by: string | null
  claimed_at: string | null
}

export interface TreeMember {
  tree_id: string
  user_id: string
  role: MemberRole
  joined_at: string
}
