-- Create a table for public profiles
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  full_name text,
  national_id text,
  phone_number text,
  avatar_url text,
  website text,
  
  constraint username_length check (char_length(full_name) >= 3)
);

-- Set up Row Level Security (RLS)
-- See https://supabase.com/docs/guides/auth/row-level-security for more details.
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Create a table for loans
create table loans (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  amount numeric not null,
  duration_months integer not null,
  monthly_payment numeric not null,
  status text check (status in ('pending', 'approved', 'rejected', 'paid')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table loans enable row level security;

create policy "Users can view own loans." on loans
  for select using (auth.uid() = user_id);

create policy "Users can insert own loans." on loans
  for insert with check (auth.uid() = user_id);

-- Create a table for verifications
create table verifications (
  user_id uuid references profiles(id) on delete cascade not null primary key,
  is_employed boolean default false,
  employer_name text,
  monthly_income numeric,
  credit_score integer default 0,
  last_checked_at timestamp with time zone default timezone('utc'::text, now())
);

alter table verifications enable row level security;

create policy "Users can view own verification." on verifications
  for select using (auth.uid() = user_id);

-- Only service role (admin) can update verifications
-- No update policy for public users
