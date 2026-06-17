-- Pepsi Street 공용 데이터베이스 스키마
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 1회 실행하세요.

-- 매장
create table if not exists public.stores (
  id text primary key,
  name text not null default '',
  category text default '',
  menu_category text default '',
  address text default '',
  note text default '',
  status text default 'approved',
  owner text default '',
  email text default '',
  phone text default '',
  instagram text default '',
  menu text default '',
  created_at timestamptz default now(),
  approved_at timestamptz,
  updated_at timestamptz default now()
);

-- 지도 URL (단일 행, id = 1)
create table if not exists public.map_links (
  id int primary key,
  naver text,
  kakao text,
  tmap text,
  updated_at timestamptz default now()
);

-- 메인 이미지 (최대 6개, base64 data URL)
create table if not exists public.hero_images (
  id text primary key,
  data text not null,
  position int default 0,
  created_at timestamptz default now()
);

-- 앱 메타(시드 여부 등)
create table if not exists public.app_meta (
  key text primary key,
  value text
);

-- RLS 활성화
alter table public.stores enable row level security;
alter table public.map_links enable row level security;
alter table public.hero_images enable row level security;
alter table public.app_meta enable row level security;

-- 내부 관리 도구이므로 anon 키로 읽기/쓰기를 모두 허용합니다.
-- (보안을 강화하려면 SETUP 문서의 "접근 제한" 안내를 참고하세요.)
drop policy if exists "public access" on public.stores;
create policy "public access" on public.stores for all using (true) with check (true);

drop policy if exists "public access" on public.map_links;
create policy "public access" on public.map_links for all using (true) with check (true);

drop policy if exists "public access" on public.hero_images;
create policy "public access" on public.hero_images for all using (true) with check (true);

drop policy if exists "public access" on public.app_meta;
create policy "public access" on public.app_meta for all using (true) with check (true);

-- 실시간 동기화(Realtime) 활성화
alter publication supabase_realtime add table public.stores;
alter publication supabase_realtime add table public.map_links;
alter publication supabase_realtime add table public.hero_images;
