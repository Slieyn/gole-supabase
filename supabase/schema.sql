-- GOLE Launch RSVP: run this whole file once in Supabase > SQL Editor > New query > Run.

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (char_length(first_name) between 1 and 100),
  last_name text not null check (char_length(last_name) between 1 and 100),
  email text not null check (char_length(email) <= 254),
  phone text not null check (char_length(phone) between 5 and 40),
  company text not null check (char_length(company) between 1 and 150),
  job_title text not null check (char_length(job_title) between 1 and 150),
  dietary_requirements text check (char_length(dietary_requirements) <= 300),
  additional_notes text check (char_length(additional_notes) <= 1000),
  attendance_status text not null default 'confirmed' check (attendance_status in ('confirmed','maybe','declined')),
  referral_source text,
  consent boolean not null default false check (consent = true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One RSVP per email address (case-insensitive) + indexes for the dashboard
create unique index if not exists rsvps_email_key on public.rsvps (lower(email));
create index if not exists rsvps_status_idx on public.rsvps (attendance_status);
create index if not exists rsvps_created_idx on public.rsvps (created_at desc);
create index if not exists rsvps_company_idx on public.rsvps (company);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists rsvps_updated on public.rsvps;
create trigger rsvps_updated before update on public.rsvps for each row execute function public.set_updated_at();

-- Admins: anyone listed here can use the dashboard
create table if not exists public.admins (user_id uuid primary key references auth.users(id) on delete cascade);

create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;

-- Row Level Security: the public (anon) can NOT read or write the table directly
alter table public.rsvps enable row level security;
alter table public.admins enable row level security;
drop policy if exists "admins read rsvps" on public.rsvps;
drop policy if exists "admins update rsvps" on public.rsvps;
drop policy if exists "admins delete rsvps" on public.rsvps;
drop policy if exists "read own admin row" on public.admins;
create policy "admins read rsvps" on public.rsvps for select to authenticated using (public.is_admin());
create policy "admins update rsvps" on public.rsvps for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete rsvps" on public.rsvps for delete to authenticated using (public.is_admin());
create policy "read own admin row" on public.admins for select to authenticated using (user_id = auth.uid());

-- Public can only: check if an email is registered, and submit/update an RSVP (via these functions)
create or replace function public.rsvp_exists(p_email text) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.rsvps where lower(email) = lower(trim(p_email)))
$$;

create or replace function public.submit_rsvp(
  p_first text, p_last text, p_email text, p_phone text, p_company text, p_job text,
  p_diet text, p_note text, p_status text, p_ref text, p_consent boolean
) returns boolean language plpgsql security definer set search_path = public as $$
declare v_new boolean;
begin
  if p_consent is not true then raise exception 'Consent is required'; end if;
  if p_status not in ('confirmed','maybe','declined') then raise exception 'Invalid attendance status'; end if;
  if trim(p_email) !~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then raise exception 'Invalid email'; end if;
  insert into public.rsvps (first_name,last_name,email,phone,company,job_title,dietary_requirements,additional_notes,attendance_status,referral_source,consent)
  values (trim(p_first),trim(p_last),lower(trim(p_email)),trim(p_phone),trim(p_company),trim(p_job),nullif(trim(p_diet),''),nullif(trim(p_note),''),p_status,p_ref,true)
  on conflict ((lower(email))) do update set
    first_name=excluded.first_name, last_name=excluded.last_name, phone=excluded.phone, company=excluded.company,
    job_title=excluded.job_title, dietary_requirements=excluded.dietary_requirements, additional_notes=excluded.additional_notes,
    attendance_status=excluded.attendance_status, referral_source=excluded.referral_source
  returning (xmax = 0) into v_new;
  return v_new; -- true = new RSVP, false = existing RSVP updated
end $$;

grant execute on function public.rsvp_exists(text) to anon, authenticated;
grant execute on function public.submit_rsvp(text,text,text,text,text,text,text,text,text,text,boolean) to anon, authenticated;
grant execute on function public.is_admin() to authenticated;

-- Live dashboard updates
alter publication supabase_realtime add table public.rsvps;
