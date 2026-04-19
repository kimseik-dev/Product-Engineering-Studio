-- 프로젝트 단계별 일정 (기획/디자인/개발/테스트)
alter table public.projects
  add column if not exists planning_start date,
  add column if not exists planning_end date,
  add column if not exists design_start date,
  add column if not exists design_end date,
  add column if not exists development_start date,
  add column if not exists development_end date,
  add column if not exists test_start date,
  add column if not exists test_end date;
