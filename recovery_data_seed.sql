-- Seed Members
INSERT INTO members (name, role, avatar, status)
VALUES 
  ('정지혜', 'Project Manager', 'https://api.dicebear.com/7.x/avataaars/svg?seed=ji_hye', 'Active'),
  ('김민수', 'Frontend Developer', 'https://api.dicebear.com/7.x/avataaars/svg?seed=min_su', 'Active'),
  ('박준성', 'Backend Developer', 'https://api.dicebear.com/7.x/avataaars/svg?seed=jun_sung', 'Active'),
  ('이지은', 'UI/UX Designer', 'https://api.dicebear.com/7.x/avataaars/svg?seed=ji_eun', 'Active'),
  ('최유진', 'Global QA', 'https://api.dicebear.com/7.x/avataaars/svg?seed=yu_jin', 'Active');

-- Seed Tasks (Assuming members get IDs 1-5)
INSERT INTO tasks (content, status, priority, project_id, progress, due_date)
VALUES 
  ('SK 텔링크 정산 연동 API 개발', 'In Progress', 'High', 1, 45, '2024-05-30'),
  ('크루페이 관리자 대시보드 UI 수정', 'Review', 'Medium', 1, 90, '2024-05-25'),
  ('서울대 메인 페이지 애니메이션 구현', 'To Do', 'High', 2, 0, '2024-06-15'),
  ('SNU 학사 관리 시스템 API 연동', 'In Progress', 'High', 2, 30, '2024-06-10'),
  ('비디치과 예약 시스템 모바일 최적화', 'Review', 'Medium', 3, 95, '2024-05-20'),
  ('스카이써니 쇼핑몰 결제 모듈 테스트', 'Done', 'High', 4, 100, '2024-05-15'),
  ('리모메드 앱 아이콘 및 리소스 최적화', 'To Do', 'Low', 5, 0, '2024-06-20'),
  ('프라코 관리자 보안 강화 작업', 'In Progress', 'High', 6, 20, '2024-07-01'),
  ('리모코리아 PG사 교체 테스트', 'Review', 'High', 7, 85, '2024-05-28'),
  ('온투인 실시간 채팅 기능 추가', 'To Do', 'Medium', 8, 10, '2024-06-30'),
  ('온플레이어 비디오 스트리밍 최적화', 'Done', 'High', 9, 100, '2024-05-01'),
  ('웨이브오더 주문 알림 시스템 구축', 'In Progress', 'Medium', 10, 60, '2024-06-05');

-- Seed Task Assignees (Task 1 -> Member 3, Task 2 -> Member 2, etc.)
-- We will need to check the generated Task and Member IDs, 
-- but for a clean reset, we can truncate and reset identity sequences or just use subqueries.

INSERT INTO task_assignees (task_id, member_id)
SELECT t.id, m.id FROM tasks t, members m WHERE t.content = 'SK 텔링크 정산 연동 API 개발' AND m.name = '박준성';
INSERT INTO task_assignees (task_id, member_id)
SELECT t.id, m.id FROM tasks t, members m WHERE t.content = '크루페이 관리자 대시보드 UI 수정' AND m.name = '김민수';
INSERT INTO task_assignees (task_id, member_id)
SELECT t.id, m.id FROM tasks t, members m WHERE t.content = '서울대 메인 페이지 애니메이션 구현' AND m.name = '이지은';
INSERT INTO task_assignees (task_id, member_id)
SELECT t.id, m.id FROM tasks t, members m WHERE t.content = 'SNU 학사 관리 시스템 API 연동' AND m.name = '박준성';
INSERT INTO task_assignees (task_id, member_id)
SELECT t.id, m.id FROM tasks t, members m WHERE t.content = '비디치과 예약 시스템 모바일 최적화' AND m.name = '김민수';

-- Seed Issues
INSERT INTO issues (title, content, status, priority, project_id, assignee_id)
SELECT 'API 응답 지연', 'SK 텔링크 정산 API 응답 속도가 간헐적으로 느려짐', 'Issue', 'Critical', 1, m.id FROM members m WHERE m.name = '박준성';
INSERT INTO issues (title, content, status, priority, project_id, assignee_id)
SELECT '안드로이드 폰트 깨짐', '특정 기기에서 폰트 렌더링 이슈 발생', 'In Progress', 'Warning', 2, m.id FROM members m WHERE m.name = '이지은';

-- Add Project Members
INSERT INTO project_members (project_id, member_id)
SELECT 1, id FROM members WHERE name IN ('정지혜', '박준성', '김민수');
INSERT INTO project_members (project_id, member_id)
SELECT 2, id FROM members WHERE name IN ('정지혜', '이지은', '박준성');
INSERT INTO project_members (project_id, member_id)
SELECT 3, id FROM members WHERE name IN ('김민수', '이지은');
