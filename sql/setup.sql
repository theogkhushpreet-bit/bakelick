-- Run this whole script in Supabase Dashboard -> SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  customer_name text not null,
  phone text not null,
  address text not null,
  city text not null,
  pincode text not null,
  notes text,
  items jsonb not null,
  subtotal integer not null check (subtotal >= 0),
  delivery_fee integer not null check (delivery_fee >= 0),
  total integer not null check (total = subtotal + delivery_fee),
  transaction_ref text,
  proof_path text,
  payment_status text not null default 'Pending verification'
    check (payment_status in ('Pending verification','Paid','Rejected')),
  order_status text not null default 'New'
    check (order_status in ('New','Confirmed','Preparing','Dispatched','Delivered','Cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_order_number_idx on public.orders (order_number);

alter table public.orders enable row level security;
-- No anon/authenticated table policies are intentionally created: all DB access goes
-- through server-side API routes using the service-role key. Never put that key in public JS.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 4194304, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 4194304,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

-- Keep storage private. Server-side service role uploads proof images and generates
-- short-lived signed URLs only after admin authentication.
