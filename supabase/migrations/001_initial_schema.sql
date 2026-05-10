-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Trees
create table trees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  visibility text not null default 'private' check (visibility in ('private','shared','public')),
  created_at timestamptz not null default now()
);

-- Members (nodes in the graph)
create table members (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references trees(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  gender text check (gender in ('male','female','other')),
  dob date,
  dod date,
  photo_url text,
  bio text,
  occupation text,
  location text,
  is_living boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- Relationships (edges in the graph)
create table relationships (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references trees(id) on delete cascade,
  from_id uuid not null references members(id) on delete cascade,
  to_id uuid not null references members(id) on delete cascade,
  type text not null check (type in ('parent_of','spouse_of','sibling_of')),
  created_at timestamptz not null default now(),
  unique(from_id, to_id, type)
);

-- Invites (share links)
create table invites (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references trees(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  token text unique not null default encode(gen_random_bytes(8), 'hex'),
  role text not null default 'editor' check (role in ('editor','viewer')),
  created_by uuid not null references auth.users(id),
  expires_at timestamptz,
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz
);

-- Tree members ACL
create table tree_members (
  tree_id uuid not null references trees(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','editor','viewer')),
  joined_at timestamptz not null default now(),
  primary key (tree_id, user_id)
);

-- Indexes
create index on members(tree_id);
create index on relationships(tree_id);
create index on tree_members(user_id);
create index on invites(token);
