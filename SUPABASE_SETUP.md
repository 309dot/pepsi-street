# 공용 데이터베이스(Supabase) 설정 가이드

이 설정을 마치면 **모든 사람이 같은 매장/지도/이미지 데이터를 실시간으로 공유**합니다.
설정 전까지는 기존처럼 각자 브라우저(localStorage)에만 저장됩니다. (사이트는 정상 동작)

## 1. Supabase 프로젝트 만들기 (무료)

1. https://supabase.com 가입 후 **New project** 생성
2. 프로젝트가 준비되면 좌측 **SQL Editor** 열기
3. 저장소의 [`supabase/schema.sql`](supabase/schema.sql) 내용을 전부 붙여넣고 **Run** 실행
   - 테이블 4개(stores, map_links, hero_images, app_meta)와 권한/실시간 설정이 만들어집니다.

## 2. 키 2개 복사

좌측 **Project Settings → API** 에서:

- **Project URL** → `https://xxxxx.supabase.co`
- **Project API keys** 의 **anon public** 키

## 3. 키 입력

[`js/config.js`](js/config.js) 파일을 열어 두 값을 채웁니다.

```js
window.PEPSI_CONFIG = {
  SUPABASE_URL: "https://xxxxx.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOi....(anon public key)",
};
```

저장 후 커밋·푸시(또는 배포)하면 끝입니다.
처음 접속 시 기존 시드 매장 데이터가 자동으로 클라우드에 1회 업로드됩니다.

## 동작 방식

- 화면은 **로컬 캐시로 즉시 표시** → 곧바로 클라우드 최신 데이터로 갱신됩니다.
- 매장 등록/수정/삭제, 지도 URL, 이미지 변경은 **모든 기기에 반영**됩니다.
- 대시보드는 **다른 사람이 바꾸면 실시간으로 자동 갱신**됩니다.
- 클라우드 연결이 실패하면 자동으로 로컬 캐시로 폴백하므로 사이트가 멈추지 않습니다.

## 접근 제한(선택, 보안 강화)

기본 설정은 anon 키로 누구나 읽기/쓰기가 가능합니다(내부 도구 기준).
쓰기를 막고 싶다면 Supabase SQL Editor에서 정책을 조정하세요. 예) 읽기는 모두 허용, 쓰기는 차단:

```sql
drop policy if exists "public access" on public.stores;
create policy "read only" on public.stores for select using (true);
```

> 참고: 매장 데이터의 메뉴 분류는 의도적으로 표준 카테고리(한식/중식/양식/일식/아시안/멕시칸/버거)로
> 자동 매핑됩니다. 원본 입력값은 그대로 저장되며, 표시 시에만 매핑됩니다.
