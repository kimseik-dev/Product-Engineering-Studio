export const statusMap = {
  'All': '전체',
  'Planning': '기획',
  'Design': '디자인',
  'Development': '개발',
  'Review': '검수',
  'LaunchRequested': '출시신청',
  'Launch': '출시'
};

// 멤버 가용성 블로커: 검수·출시신청·출시는 제외 (개발 리소스 많이 안 씀)
export const BLOCKING_STATUSES = ['Planning', 'Design', 'Development'];

export const AVATAR_LIST = [
  ...['woman_1','woman_2','woman_3','woman_4','woman_5','woman_6','woman_7','woman_8','woman_9']
    .map(id => ({ id, path: `/avatars/${id}.png`, category: 'Female' })),
  ...['man_1','man_2','man_3','man_4','man_5','man_6','man_7','man_8','man_9']
    .map(id => ({ id, path: `/avatars/${id}.png`, category: 'Male' })),
  ...['mixed_1','mixed_2','mixed_3','mixed_4','mixed_5','mixed_6','mixed_7','mixed_8','mixed_9']
    .map(id => ({ id, path: `/avatars/${id}.png`, category: 'Premium' })),
];

export const emptyProjectForm = {
  title: '',
  group_name: '',
  task: '',
  status: 'Development',
  area: '',
  progress: 0,
  end_date: '',
  inspection_date: '',
  planning_start: '',
  planning_end: '',
  design_start: '',
  design_end: '',
  development_start: '',
  development_end: '',
  test_start: '',
  test_end: '',
};
