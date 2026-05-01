-- posts 테이블에 image_url 컬럼 추가
-- (Prisma 스키마에는 정의되어 있었으나 실제 DB에는 누락된 상태였음)
alter table public.posts
  add column if not exists image_url text;

-- PostgREST 스키마 캐시 리로드
notify pgrst, 'reload schema';
