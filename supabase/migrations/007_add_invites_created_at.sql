-- 7. Add created_at to invites for proper ordering and tracking
alter table invites 
add column if not exists created_at timestamptz not null default now();
