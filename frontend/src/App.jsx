import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  CheckSquare, 
  Users, 
  Settings, 
  Filter, 
  Search,
  MoreVertical,
  Calendar,
  Layers,
  Rocket,
  Trash2,
  UserPlus,
  X,
  Plus,
  Hash,
  AlertCircle,
  AlertTriangle,
  Circle,
  Clock,
  CheckCircle,
  Eye,
  EyeOff,
  MessageSquare,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './lib/supabase';
import TaskBoard from './components/TaskBoard';
import IssueTracker from './components/IssueTracker';
import ShareBoard from './components/ShareBoard';
import WritingPage from './components/WritingPage';
import { Toaster, toast } from 'react-hot-toast';
import './App.css';

const statusMap = {
  'All': '전체',
  'Development': '개발 중',
  'Review': '검수 중',
  'Launch': '출시'
};

const AVATAR_LIST = [
  { id: 'woman_1', path: '/avatars/woman_1.png', category: 'Female' },
  { id: 'woman_2', path: '/avatars/woman_2.png', category: 'Female' },
  { id: 'woman_3', path: '/avatars/woman_3.png', category: 'Female' },
  { id: 'woman_4', path: '/avatars/woman_4.png', category: 'Female' },
  { id: 'woman_5', path: '/avatars/woman_5.png', category: 'Female' },
  { id: 'woman_6', path: '/avatars/woman_6.png', category: 'Female' },
  { id: 'woman_7', path: '/avatars/woman_7.png', category: 'Female' },
  { id: 'woman_8', path: '/avatars/woman_8.png', category: 'Female' },
  { id: 'woman_9', path: '/avatars/woman_9.png', category: 'Female' },
  { id: 'man_1', path: '/avatars/man_1.png', category: 'Male' },
  { id: 'man_2', path: '/avatars/man_2.png', category: 'Male' },
  { id: 'man_3', path: '/avatars/man_3.png', category: 'Male' },
  { id: 'man_4', path: '/avatars/man_4.png', category: 'Male' },
  { id: 'man_5', path: '/avatars/man_5.png', category: 'Male' },
  { id: 'man_6', path: '/avatars/man_6.png', category: 'Male' },
  { id: 'man_7', path: '/avatars/man_7.png', category: 'Male' },
  { id: 'man_8', path: '/avatars/man_8.png', category: 'Male' },
  { id: 'man_9', path: '/avatars/man_9.png', category: 'Male' },
  { id: 'mixed_1', path: '/avatars/mixed_1.png', category: 'Premium' },
  { id: 'mixed_2', path: '/avatars/mixed_2.png', category: 'Premium' },
  { id: 'mixed_3', path: '/avatars/mixed_3.png', category: 'Premium' },
  { id: 'mixed_4', path: '/avatars/mixed_4.png', category: 'Premium' },
  { id: 'mixed_5', path: '/avatars/mixed_5.png', category: 'Premium' },
  { id: 'mixed_6', path: '/avatars/mixed_6.png', category: 'Premium' },
  { id: 'mixed_7', path: '/avatars/mixed_7.png', category: 'Premium' },
  { id: 'mixed_8', path: '/avatars/mixed_8.png', category: 'Premium' },
  { id: 'mixed_9', path: '/avatars/mixed_9.png', category: 'Premium' },
];

const App = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [taskFilterMemberId, setTaskFilterMemberId] = useState('All');
  const [showCompleted, setShowCompleted] = useState(true);

  // Writing Page States
  const [isWritingContent, setIsWritingContent] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  // CRUD States (Projects)
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectForm, setProjectForm] = useState({
    title: '',
    group_name: '',
    task: '',
    status: 'Development',
    area: '',
    progress: 0,
    end_date: '',
    inspection_date: ''
  });

  // CRUD States (Members)
  const [allMembers, setAllMembers] = useState([]);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);
  const [memberForm, setMemberForm] = useState({
    name: '',
    role: '',
    avatar: '',
    status: 'Active'
  });

  // Delete Confirmation States
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);

  // Category States
  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    label: '',
    color: '#6366f1'
  });

  const [selectedMemberProjects, setSelectedMemberProjects] = useState(null);

  const [errorStatus, setErrorStatus] = useState(null);
  const [debugLogs, setDebugLogs] = useState([]);

  // Quick Assign States
  const [showAssigneeModal, setShowAssigneeModal] = useState(false);
  const [assigningTask, setAssigningTask] = useState(null);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState([]);

  const addLog = (msg) => {
    setDebugLogs(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from('post_categories').select('*').order('id', { ascending: true });
      if (error) throw error;
      
      // Seed if empty
      if (data.length === 0) {
        const initial = [
          { name: 'General', label: '일반', color: '#6366f1' },
          { name: 'Notice', label: '공지사항', color: '#ef4444' },
          { name: 'Tip', label: '팁/노하우', color: '#10b981' },
          { name: 'Reference', label: '참고자료', color: '#f59e0b' }
        ];
        const { error: seedErr } = await supabase.from('post_categories').insert(initial);
        if (seedErr) throw seedErr;
        const { data: seeded } = await supabase.from('post_categories').select('*').order('id', { ascending: true });
        setCategories(seeded);
      } else {
        setCategories(data);
      }
    } catch (error) {
      console.error('Category fetch error:', error.message);
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name || !categoryForm.label) {
      toast.error('필수 정보를 모두 입력해주세요! ✨');
      return;
    }
    try {
      setIsSubmittingCategory(true);
      if (editingCategory) {
        const { error } = await supabase.from('post_categories').update(categoryForm).eq('id', editingCategory.id);
        if (error) throw error;
        toast.success('카테고리가 수정되었습니다! 👍');
      } else {
        // name 중복 체크
        const { data: existing } = await supabase.from('post_categories').select('id').eq('name', categoryForm.name).maybeSingle();
        if (existing) {
          toast.error('이미 존재하는 식별 키입니다. 다른 키를 입력해주세요! 😅');
          return;
        }

        const { error } = await supabase.from('post_categories').insert([categoryForm]);
        if (error) {
          console.error('Category insert error detail:', error);
          throw error;
        }
        toast.success('새 카테고리가 등록되었습니다! 🚀');
      }
      setShowCategoryModal(false);
      fetchCategories();
    } catch (error) {
      console.error('Category save error:', error);
      toast.error(`저장 오류: ${error.message || '알 수 없는 오류가 발생했습니다.'}`);
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('이 카테고리를 정말 삭제할까요? 관련 게시글의 카테고리가 초기화될 수 있어요.')) return;
    try {
      const { error } = await supabase.from('post_categories').delete().eq('id', id);
      if (error) throw error;
      toast.success('카테고리가 삭제되었습니다.');
      fetchCategories();
    } catch (error) {
      toast.error(`삭제 오류: ${error.message}`);
    }
  };

  const fetchProjects = async () => {
    try {
      addLog('Fetching data from Supabase...');
      setLoading(true);
      setErrorStatus(null);
      
      const [projRes, memRes, relRes, issueRes] = await Promise.all([
        supabase.from('projects').select('*').order('id', { ascending: true }),
        supabase.from('members').select('*'),
        supabase.from('project_members').select('*'),
        supabase.from('issues').select('*')
      ]);

      if (projRes.error) throw projRes.error;
      if (memRes.error) throw memRes.error;
      // Handle project_members 404/error gracefully to prevent UI freeze
      if (relRes.error) {
        console.warn('Project members relation fetch failed:', relRes.error.message);
      }
      if (issueRes.error) throw issueRes.error;

      // Global members state for Team view
      setAllMembers(memRes.data);

      const combinedData = projRes.data.map(project => {
        const associatedMemberIds = relRes.data
          .filter(rel => String(rel.project_id) === String(project.id))
          .map(rel => String(rel.member_id));

        const projMembers = memRes.data.filter(m => associatedMemberIds.includes(String(m.id)));
        const projIssues = issueRes.data.filter(i => String(i.project_id) === String(project.id));
        
        return { 
          ...project, 
          members: projMembers,
          issues: projIssues
        };
      });
      
      addLog(`Success! Combined ${combinedData.length} projects.`);
      setProjects(combinedData);
    } catch (error) {
      addLog(`Error: ${error.message}`);
      setErrorStatus(error.message);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingProject(null);
    setProjectForm({
      title: '',
      group_name: '',
      task: '',
      status: 'Development',
      area: '',
      progress: 0,
      end_date: '',
      inspection_date: ''
    });
    setShowFormModal(true);
  };

  const openEditModal = (e, project) => {
    e?.stopPropagation();
    setEditingProject(project);
    setProjectForm({
      title: project.title,
      group_name: project.group_name,
      task: project.task || '',
      status: project.status,
      area: project.area,
      progress: project.progress,
      end_date: project.end_date ? project.end_date.split('T')[0] : '',
      inspection_date: project.inspection_date ? project.inspection_date.split('T')[0] : ''
    });
    setShowFormModal(true);
  };

  const handleSaveProject = async () => {
    if (!projectForm.title || !projectForm.group_name) {
      alert('프로젝트 명과 그룹명은 필수입니다~ 대표님! 😅');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Data Cleaning: Convert empty end_date to null for Supabase
      const payload = {
        ...projectForm,
        end_date: projectForm.end_date === '' ? null : projectForm.end_date,
        inspection_date: projectForm.inspection_date === '' ? null : projectForm.inspection_date
      };

      if (editingProject) {
        const { error } = await supabase
          .from('projects')
          .update(payload)
          .eq('id', editingProject.id);
        if (error) throw error;
        addLog(`Project "${projectForm.title}" updated.`);
      } else {
        const { error } = await supabase
          .from('projects')
          .insert([payload]);
        if (error) throw error;
        addLog(`New project "${projectForm.title}" created.`);
      }
      setShowFormModal(false);
      fetchProjects();
    } catch (error) {
      alert(`저장 중 오류가 발생했어요: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async (e, id) => {
    e?.stopPropagation();
    if (!window.confirm('정말 이 프로젝트를 삭제하시겠어요? 이 작업은 되돌릴 수 없습니다. ⚠️')) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      if (error) throw error;
      addLog(`Project ID ${id} deleted.`);
      fetchProjects();
      if (selectedProject?.id === id) setSelectedProject(null);
    } catch (error) {
      alert(`삭제 중 오류가 발생했어요: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Member CRUD Functions ---
  const openCreateMemberModal = () => {
    setEditingMember(null);
    setMemberForm({
      name: '',
      role: '',
      avatar: '',
      status: 'Active'
    });
    setShowMemberModal(true);
  };

  const openEditMemberModal = (member) => {
    setEditingMember(member);
    setMemberForm({
      name: member.name,
      role: member.role,
      avatar: member.avatar || '',
      status: member.status
    });
    setShowMemberModal(true);
  };

  const handleSaveMember = async () => {
    if (!memberForm.name || !memberForm.role) {
      alert('이름과 역할은 필수입니다~ 대표님! 😅');
      return;
    }

    try {
      setIsSubmittingMember(true);
      if (editingMember) {
        const { error } = await supabase
          .from('members')
          .update(memberForm)
          .eq('id', editingMember.id);
        if (error) throw error;
        addLog(`Member "${memberForm.name}" updated.`);
      } else {
        const { error } = await supabase
          .from('members')
          .insert([memberForm]);
        if (error) throw error;
        addLog(`New member "${memberForm.name}" registered.`);
      }
      setShowMemberModal(false);
      fetchProjects(); // List update
    } catch (error) {
      alert(`저장 중 오류가 발생했어요: ${error.message}`);
    } finally {
      setIsSubmittingMember(false);
    }
  };

  const handleDeleteMember = (member) => {
    setMemberToDelete(member);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteMember = async () => {
    if (!memberToDelete) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', memberToDelete.id);
      if (error) throw error;
      toast.success(`${memberToDelete.name} 님과 작별했습니다. 😢`);
      addLog(`Member ID ${memberToDelete.id} deleted.`);
      setShowDeleteConfirm(false);
      fetchProjects();
    } catch (error) {
      toast.error(`삭제 중 오류가 발생했어요: ${error.message}`);
    } finally {
      setLoading(false);
      setMemberToDelete(null);
    }
  };

  const handleMemberClick = (memberId) => {
    const member = allMembers.find(m => String(m.id) === String(memberId));
    if (member) {
      const memberProjects = projects.filter(p => p.members?.some(m => String(m.id) === String(memberId)));
      setSelectedMemberProjects({ ...member, projects: memberProjects });
    }
  };

  const openQuickAssignModal = (task) => {
    setAssigningTask(task);
    setSelectedAssigneeIds(task.assignee_ids ? task.assignee_ids.map(m => String(m)) : []);
    setShowAssigneeModal(true);
  };

  const handleSaveQuickAssignees = async () => {
    if (!assigningTask) return;
    try {
      setIsSubmitting(true);
      await supabase.from('task_assignees').delete().eq('task_id', assigningTask.id);
      if (selectedAssigneeIds.length > 0) {
        const relations = selectedAssigneeIds.map(mId => ({ member_id: mId, task_id: assigningTask.id }));
        const { error } = await supabase.from('task_assignees').insert(relations);
        if (error) throw error;
        for (const mId of selectedAssigneeIds) {
          const { data: exists } = await supabase.from('project_members').select('*').eq('member_id', mId).eq('project_id', assigningTask.project_id).maybeSingle();
          if (!exists) await supabase.from('project_members').insert([{ member_id: mId, project_id: assigningTask.project_id }]);
        }
      }
      toast.success('배정 정보가 업데이트되었어요! ✨');
      setShowAssigneeModal(false);
      fetchProjects(); 
    } catch (error) {
      toast.error('배정 중 오류가 발생했습니다. 😢');
    } finally {
      setIsSubmitting(false);
    }
  };

  React.useEffect(() => {
    fetchProjects();
    fetchCategories();

    // Set up Realtime subscription for projects, members, and categories
    const channels = supabase.channel('pes_db_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => fetchProjects())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => fetchProjects())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_members' }, () => fetchProjects())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, () => fetchProjects())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_categories' }, () => fetchCategories())
      .subscribe();

    return () => {
      supabase.removeChannel(channels);
    };
  }, []);

  const filteredProjects = projects.filter(p => {
    const matchesFilter = filter === 'All' || p.status === filter;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (p.group_name && p.group_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const stats = [
    { label: '대기 중', value: projects.filter(p => !p.status || p.status === 'Pending').length, color: 'rgba(255, 255, 255, 0.5)' },
    { label: '진행 중', value: projects.filter(p => p.status === 'Development').length, color: 'var(--info-gradient)' },
    { label: '검수 중', value: projects.filter(p => p.status === 'Review').length, color: 'var(--primary-gradient)' },
    { label: '완료', value: projects.filter(p => p.status === 'Launch').length, color: 'var(--success-gradient)' },
  ];

  const menuItems = [
    { id: 'dashboard', label: '대시보드', icon: LayoutDashboard, category: 'work' },
    { id: 'projects', label: '프로젝트', icon: Briefcase, category: 'work' },
    { id: 'tasks', label: '작업', icon: CheckSquare, category: 'work' },
    { id: 'issues', label: '이슈', icon: AlertTriangle, category: 'work' },
    { id: 'completed', label: '완료된 프로젝트', icon: CheckCircle, category: 'work' },
    { id: 'knowledge', label: '정보 공유', icon: MessageSquare, category: 'community' },
    { id: 'team', label: '팀', icon: Users, category: 'community' },
    { id: 'settings', label: '설정', icon: Settings, category: 'system' },
  ];

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Stats Row */}
            <div className="stats-row">
              {stats.map((stat, idx) => (
                <motion.div 
                  key={idx} 
                  className="stat-card glass"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <span className="stat-label">{stat.label}</span>
                  <span className="stat-value" style={{ background: stat.color, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {stat.value}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Filters and Grid */}
            <section className="projects-section">
              <div className="section-header">
                <h2 className="section-title">전체 프로젝트 대시보드</h2>
                {loading && <span className="loading-spinner">데이터 불러오는 중...</span>}
                {errorStatus && <span className="error-message" style={{ color: '#ff4d4d', marginLeft: '10px' }}>구성 오류: {errorStatus}</span>}
                  <div className="filters glass">
                    <button 
                      className={`toggle-completed-btn-minimal ${!showCompleted ? 'off' : ''}`}
                      onClick={() => setShowCompleted(!showCompleted)}
                      title={showCompleted ? "완료된 프로젝트 숨기기" : "완료된 프로젝트 보기"}
                    >
                      {showCompleted ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <div className="filter-divider"></div>
                    {Object.keys(statusMap).map((f) => (
                    <button 
                      key={f} 
                      className={`filter-btn ${filter === f ? 'active' : ''}`}
                      onClick={() => setFilter(f)}
                    >
                      {statusMap[f]}
                    </button>
                  ))}
                </div>
              </div>

            <div className="project-sections-container">
                {/* Current Projects Section */}
                <div className="project-group-section">
                  <div className="section-header">
                    <h3 className="sub-section-title">🚀 현재 진행 프로젝트</h3>
                  </div>
                  <div className="project-grid">
                    {filteredProjects
                      .filter(p => p.status !== 'Launch')
                      .map((project, idx) => (
                        <motion.div 
                          key={project.id} 
                          className={`project-card glass card-glow ${project.status.toLowerCase()}`}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => setSelectedProject(project)}
                        >
                          <div className="card-header">
                            <span className="group-tag">{project.group_name}</span>
                            <div className="card-actions">
                              <button className="icon-btn xs" onClick={(e) => openEditModal(e, project)}><Settings size={14} /></button>
                              <button className="icon-btn xs delete" onClick={(e) => handleDeleteProject(e, project.id)}><Trash2 size={14} /></button>
                            </div>
                          </div>
                          <div className="member-avatars">
                            {project.members && project.members.map((member, mIdx) => (
                              <div 
                                key={member.id} 
                                className="avatar-circle"
                                title={`${member.name} (${member.role})`}
                                style={{ zIndex: 10 - mIdx }}
                              >
                                {member.avatar ? <img src={member.avatar} alt={member.name} /> : member.name[0]}
                              </div>
                            ))}
                            {(!project.members || project.members.length === 0) && (
                              <div className="avatar-circle empty"><Users size={12} /></div>
                            )}
                          </div>
                          <h3 className="project-title">
                            {project.title}
                            {project.issues && project.issues.filter(i => i.status !== 'Resolved').length > 0 && (
                              <span className="issue-count-badge" title="미해결 이슈">
                                <AlertTriangle size={10} /> {project.issues.filter(i => i.status !== 'Resolved').length}
                              </span>
                            )}
                          </h3>
                          <p className="project-task">{project.task}</p>
                          
                          <div className="card-meta">
                            <div className="meta-item"><Layers size={14} /> {project.area}</div>
                            {project.inspection_date && (
                              <div className="meta-item" title="검수일"><Search size={14} /> {new Date(project.inspection_date).toLocaleDateString()}</div>
                            )}
                            {project.end_date && (
                              <div className="meta-item" title="종료일"><Calendar size={14} /> {new Date(project.end_date).toLocaleDateString()}</div>
                            )}
                            <div className={`badge badge-${project.status.toLowerCase()}`}>{statusMap[project.status]}</div>
                          </div>

                          <div className="progress-container">
                            <div className="progress-label">
                              <span>진행률</span>
                              <span>{project.progress}%</span>
                            </div>
                            <div className="progress-bar-bg">
                              <div 
                                className={`progress-bar-fill fill-${project.status.toLowerCase()}`}
                                style={{ 
                                  width: `${project.progress}%`,
                                  transition: 'width 1s ease-in-out'
                                }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    {filteredProjects.filter(p => p.status !== 'Launch').length === 0 && (
                      <motion.div 
                        className="empty-state-card"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="empty-state-icon">
                          <Rocket size={40} strokeWidth={1} />
                        </div>
                        <div className="empty-state-text">
                          <h4>진행 중인 프로젝트가 없습니다</h4>
                          <p>새로운 프로젝트를 계획하거나 시작해보세요! ✨</p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Completed Projects Section */}
                {showCompleted && (
                  <div className="project-group-section completed-area mt-12">
                    <div className="section-header border-t border-white/5 pt-10">
                      <h3 className="sub-section-title opacity-70">✅ 완료된 프로젝트</h3>
                    </div>
                    <div className="project-grid mini-grid">
                      {filteredProjects.filter(p => p.status === 'Launch').map((project, idx) => (
                        <motion.div 
                          key={project.id} 
                          className="project-card glass card-glow completed-card"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => setSelectedProject(project)}
                        >
                          <div className="card-header">
                          <span className="group-tag">{project.group_name}</span>
                          <div className="card-actions">
                            <button className="icon-btn xs" onClick={(e) => openEditModal(e, project)}><Settings size={14} /></button>
                            <button className="icon-btn xs delete" onClick={(e) => handleDeleteProject(e, project.id)}><Trash2 size={14} /></button>
                          </div>
                        </div>
                          <h3 className="project-title">{project.title}</h3>
                          <div className="card-meta">
                            <div className={`badge badge-launch small`}>완료됨</div>
                            <div className="progress-mini-label">{project.progress}%</div>
                          </div>
                        </motion.div>
                      ))}
                      {filteredProjects.filter(p => p.status === 'Launch').length === 0 && (
                        <motion.div 
                          className="empty-state-card"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <div className="empty-state-icon">
                            <CheckCircle size={40} strokeWidth={1} />
                          </div>
                          <div className="empty-state-text">
                            <h4>아직 완료된 프로젝트가 없어요</h4>
                            <p>열심히 진행 중인 프로젝트들이 곧 결실을 맺을 거예요! 🏆</p>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </motion.div>
        );
      case 'projects':
        return (
          <motion.div 
            className="projects-list-view"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="list-header glass">
              <div className="list-title-area">
                <h2>📁 프로젝트 전체 목록</h2>
                <p>총 {filteredProjects.length}개의 프로젝트가 관리되고 있습니다.</p>
              </div>
              <div className="list-actions">
                <div className="filters glass compact">
                  <button 
                    className={`toggle-completed-btn-minimal ${!showCompleted ? 'off' : ''}`}
                    onClick={() => setShowCompleted(!showCompleted)}
                    title={showCompleted ? "완료된 프로젝트 숨기기" : "완료된 프로젝트 보기"}
                  >
                    {showCompleted ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <div className="filter-divider"></div>
                  {Object.keys(statusMap).map((f) => (
                    <button 
                      key={f} 
                      className={`filter-btn ${filter === f ? 'active' : ''}`}
                      onClick={() => setFilter(f)}
                    >
                      {statusMap[f]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="projects-table-container glass">
              <table className="projects-table">
                <thead>
                  <tr>
                    <th>프로젝트 명</th>
                    <th>그룹</th>
                    <th>상태</th>
                    <th>종료일</th>
                    <th>진행률</th>
                    <th>담당 영역</th>
                    <th>멤버</th>
                    <th className="text-right">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects
                    .filter(p => showCompleted || p.status !== 'Launch')
                    .map((project, idx) => (
                    <motion.tr 
                      key={project.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => setSelectedProject(project)}
                      className="clickable-row"
                    >
                      <td className="col-title">
                        <div className="project-info-cell">
                          <Rocket size={14} className="cell-icon" />
                          <span>{project.title}</span>
                        </div>
                      </td>
                      <td><span className="group-tag small">{project.group_name}</span></td>
                      <td><div className={`badge badge-${project.status.toLowerCase()} small`}>{statusMap[project.status]}</div></td>
                      <td><span className="date-cell">{project.inspection_date ? new Date(project.inspection_date).toLocaleDateString() : '-'}</span></td>
                      <td><span className="date-cell">{project.end_date ? new Date(project.end_date).toLocaleDateString() : '-'}</span></td>
                      <td className="col-progress">
                        <div className="progress-cell">
                          <span className="progress-text">{project.progress}%</span>
                          <div className="progress-bar-bg mini">
                            <div 
                              className={`progress-bar-fill fill-${project.status.toLowerCase()}`}
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td><span className="area-label">{project.area}</span></td>
                      <td className="members-cell">
                        <div className="member-avatars mini">
                          {project.members && project.members.slice(0, 3).map(m => (
                            <div 
                              key={m.id} 
                              className="avatar-circle mini cursor-pointer" 
                              title={`${m.name} (${m.role})`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMemberClick(m.id);
                              }}
                            >
                              {m.avatar ? <img src={m.avatar} alt={m.name} /> : m.name[0]}
                            </div>
                          ))}
                          {project.members && project.members.length > 3 && (
                            <div className="avatar-circle mini more">+{project.members.length - 3}</div>
                          )}
                        </div>
                      </td>
                      <td className="actions-cell">
                        <div className="row-actions">
                          <button className="icon-btn small" onClick={(e) => openEditModal(e, project)}><Settings size={14} /></button>
                          <button className="icon-btn small delete" onClick={(e) => handleDeleteProject(e, project.id)}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                  {filteredProjects.filter(p => showCompleted || p.status !== 'Launch').length === 0 && (
                    <tr>
                      <td colSpan="8" className="empty-row">검색 결과가 없습니다.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        );
      case 'tasks':
        return (
          <motion.div 
            className="tasks-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <TaskBoard 
              members={allMembers} 
              projects={projects} 
              initialMemberId={taskFilterMemberId} 
              onProjectUpdate={fetchProjects}
              onQuickAssign={openQuickAssignModal}
            />
          </motion.div>
        );
      case 'issues':
        return (
          <motion.div 
            className="issues-view"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <IssueTracker 
              members={allMembers} 
              projects={projects} 
              onUpdate={fetchProjects}
            />
          </motion.div>
        );
      case 'knowledge':
        return (
          <motion.div 
            className="knowledge-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <ShareBoard 
              members={allMembers} 
              categories={categories}
              onOpenWriter={(post) => {
                setEditingPost(post);
                setIsWritingContent(true);
              }}
            />
          </motion.div>
        );
      case 'team':
        return (
          <motion.div 
            className="team-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="list-header glass">
              <div className="list-title-area">
                <h2>🧑‍🤝‍🧑 팀 멤버 관리</h2>
                <p>현재 총 {allMembers.length}명의 전문가가 함께하고 있습니다.</p>
              </div>
              <button className="action-btn primary" onClick={openCreateMemberModal}>
                <UserPlus size={18} /> 새 멤버 초대
              </button>
            </div>

            <div className="member-grid">
              {allMembers.map((member, idx) => (
                <motion.div 
                  key={member.id} 
                  className="member-card glass card-glow"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => handleMemberClick(member.id)}
                >
                  <div className="member-card-actions">
                    <button className="icon-btn xs" onClick={(e) => { e.stopPropagation(); openEditMemberModal(member); }}><Settings size={14} /></button>
                    <button className="icon-btn xs delete" onClick={(e) => { e.stopPropagation(); handleDeleteMember(member); }}><Trash2 size={14} /></button>
                  </div>
                  <div className="member-card-header">
                    <div className="member-avatar-giant">
                      {member.avatar ? <img src={member.avatar} alt={member.name} /> : member.name[0]}
                      <span className={`status-dot-large ${member.status.toLowerCase()}`}></span>
                    </div>
                  </div>
                  <div className="member-card-body">
                    <h3 className="member-name">{member.name}</h3>
                    <p className="member-role">{member.role}</p>
                    <div className={`status-badge-compact st-${member.status.toLowerCase()}`}>
                      {member.status}
                    </div>
                  </div>
                  <div className="member-card-footer">
                    <div className="member-stats">
                      <div className="m-stat">
                        <span className="m-label">참여 프로젝트</span>
                        <span className="m-value">{projects.filter(p => p.members?.some(m => m.id === member.id)).length}개</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        );
      case 'settings':
        return (
          <motion.div 
            className="projects-list-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="list-header glass">
              <div className="list-title-area">
                <h2>⚙️ 환경 설정</h2>
                <p>시스템 전반의 설정을 영자와 함께 관리해보세요! ✨</p>
              </div>
            </div>

            <div className="settings-section glass mt-6" style={{ padding: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: 700 }}>📁 정보 공유 카테고리 관리</h3>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>정보 공유 게시판에서 사용할 카테고리를 추가하거나 수정할 수 있어요.</p>
                </div>
                <button 
                  className="action-btn primary" 
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryForm({ name: '', label: '', color: '#6366f1' });
                    setShowCategoryModal(true);
                  }}
                >
                  <Plus size={18} /> 새 카테고리 추가
                </button>
              </div>

              <div className="categories-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {categories.map(cat => (
                  <motion.div 
                    key={cat.id} 
                    className="category-card glass"
                    whileHover={{ scale: 1.02 }}
                    style={{ padding: '20px', position: 'relative', borderLeft: `4px solid ${cat.color || '#6366f1'}` }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 700 }}>{cat.label}</div>
                        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Key: {cat.name}</div>
                      </div>
                      <div className="card-actions" style={{ display: 'flex', gap: '8px' }}>
                        <button className="icon-btn xs" onClick={() => {
                          setEditingCategory(cat);
                          setCategoryForm({ name: cat.name, label: cat.label, color: cat.color || '#6366f1' });
                          setShowCategoryModal(true);
                        }}><Settings size={14} /></button>
                        <button className="icon-btn xs danger" onClick={() => handleDeleteCategory(cat.id)}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        );
      case 'completed':
        const completedProjects = projects.filter(p => p.status === 'Launch');
        return (
          <motion.div 
            className="projects-list-view"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="list-header glass">
              <div className="list-title-area">
                <h2>✅ 완료된 프로젝트 목록</h2>
                <p>총 {completedProjects.length}개의 프로젝트가 성공적으로 완료되었습니다! 🏆</p>
              </div>
            </div>

            <div className="projects-table-container glass">
              <table className="projects-table">
                <thead>
                  <tr>
                    <th>프로젝트 명</th>
                    <th>그룹</th>
                    <th>상태</th>
                    <th>종료일</th>
                    <th>진행률</th>
                    <th>담당 영역</th>
                    <th>멤버</th>
                    <th className="text-right">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {completedProjects.map((project, idx) => (
                    <motion.tr 
                      key={project.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => setSelectedProject(project)}
                      className="clickable-row"
                    >
                      <td className="col-title">
                        <div className="project-info-cell">
                          <CheckCircle size={14} className="cell-icon success-text" />
                          <span>{project.title}</span>
                        </div>
                      </td>
                      <td><span className="group-tag small">{project.group_name}</span></td>
                      <td><div className={`badge badge-${project.status.toLowerCase()} small`}>{statusMap[project.status]}</div></td>
                      <td><span className="date-cell">{project.end_date ? new Date(project.end_date).toLocaleDateString() : '-'}</span></td>
                      <td className="col-progress">
                        <div className="progress-cell">
                          <span className="progress-text">{project.progress}%</span>
                          <div className="progress-bar-bg mini">
                            <div 
                              className={`progress-bar-fill fill-${project.status.toLowerCase()}`}
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td><span className="area-label">{project.area}</span></td>
                      <td className="members-cell">
                        <div className="member-avatars">
                          {project.members && project.members.slice(0, 3).map(m => (
                            <div 
                              key={m.id} 
                              className="member-avatar mini cursor-pointer" 
                              title={`${m.name} (${m.role})`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMemberClick(m.id);
                              }}
                            >
                              {m.avatar ? <img src={m.avatar} alt={m.name} /> : m.name[0]}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="actions-cell">
                        <div className="row-actions">
                          <button className="icon-btn small" onClick={(e) => openEditModal(e, project)}><Settings size={14} /></button>
                          <button className="icon-btn small delete" onClick={(e) => handleDeleteProject(e, project.id)}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                  {completedProjects.length === 0 && (
                    <tr>
                      <td colSpan="8" className="empty-row">아직 완료된 프로젝트가 없습니다.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <AnimatePresence mode="wait">
        {isWritingContent ? (
          <WritingPage 
            key="writing-page"
            editData={editingPost}
            onClose={() => {
              setIsWritingContent(false);
              setEditingPost(null);
            }}
            onSaveSuccess={() => {
              setIsWritingContent(false);
              setEditingPost(null);
            }}
            categories={categories}
          />
        ) : (
          <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar glass">
        <div className="logo-container">
          <Rocket className="logo-icon" />
          <h2 className="logo-text">HERO</h2>
        </div>
        <nav className="nav-menu">
          <button className="create-project-btn" onClick={openCreateModal}>
            <Rocket size={18} /> 새 프로젝트 추가
          </button>
          <div className="nav-divider" style={{ margin: '15px 0' }}></div>
          
          <div className="menu-group-title" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', padding: '0 10px', marginBottom: '8px' }}>업무 관리</div>
          {menuItems.filter(i => i.category === 'work').map((item) => (
            <div 
              key={item.id}
              className={`nav-item ${activeMenu === item.id ? 'active' : ''}`}
              onClick={() => {
                setActiveMenu(item.id);
                if (item.id !== 'tasks') setTaskFilterMemberId('All');
              }}
            >
              <item.icon size={20} />
              {item.label}
            </div>
          ))}

          <div style={{ marginTop: '20px' }}></div>
          <div className="menu-group-title" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', padding: '0 10px', marginBottom: '8px' }}>커뮤니티</div>
          {menuItems.filter(i => i.category === 'community').map((item) => (
            <div 
              key={item.id}
              className={`nav-item ${activeMenu === item.id ? 'active' : ''}`}
              onClick={() => {
                setActiveMenu(item.id);
                if (item.id !== 'tasks') setTaskFilterMemberId('All');
              }}
            >
              <item.icon size={20} />
              {item.label}
            </div>
          ))}

          <div className="nav-divider" style={{ margin: '15px 0' }}></div>
          {menuItems.filter(i => i.category === 'system').map((item) => (
            <div 
              key={item.id}
              className={`nav-item ${activeMenu === item.id ? 'active' : ''}`}
              onClick={() => {
                setActiveMenu(item.id);
                if (item.id !== 'tasks') setTaskFilterMemberId('All');
              }}
            >
              <item.icon size={20} />
              {item.label}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <p className="footer-text">Built by 김부장🎨</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div className="header-left">
            <h1 className="title">Product Engineering Studio</h1>
            <p className="subtitle">
              {menuItems.find(m => m.id === activeMenu)?.label} &middot; {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
            </p>
          </div>
          <div className="header-right">
            <div className="search-bar glass">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="프로젝트 검색..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
                <React.Fragment key={activeMenu}>
                  {renderContent()}
                </React.Fragment>
        </AnimatePresence>
      </main>

      {/* Project Detail Modal */}
      <AnimatePresence>
        {selectedProject && (
          <div className="modal-overlay" onClick={() => setSelectedProject(null)}>
            <motion.div 
              className={`modal-content glass premium-modal status-${selectedProject.status.toLowerCase()}`}
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Decorative background orb */}
              <div className="modal-glow-orb"></div>

              <div className="modal-header">
                <div className="modal-header-info">
                  <motion.div 
                    className="hero-icon-small"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.1 }}
                  >
                    <Rocket size={18} />
                  </motion.div>
                  <h2 className="modal-title">{selectedProject.title}</h2>
                  <div className={`badge badge-${selectedProject.status.toLowerCase()} modal-badge`}>
                    <span className="pulse-dot"></span>
                    {statusMap[selectedProject.status]}
                  </div>
                  {selectedProject.end_date && (
                    <div className="modal-date-info">
                      <Calendar size={14} /> 
                      <span>종료일: {new Date(selectedProject.end_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <div className="modal-header-actions">
                  <button className="icon-btn small" title="수정" onClick={(e) => { openEditModal(e, selectedProject); setSelectedProject(null); }}><Settings size={14} /></button>
                  <button className="icon-btn small delete" title="삭제" onClick={(e) => { handleDeleteProject(e, selectedProject.id); }}><Trash2 size={14} /></button>
                  <button className="close-btn" onClick={() => setSelectedProject(null)}><X size={20} /></button>
                </div>
              </div>
              
              <div className="modal-body custom-scrollbar">
                <motion.div 
                  className="detail-item task-section"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h3><Rocket size={16} /> 현재 작업</h3>
                  <p>{selectedProject.task || '진행 중인 작업 내용이 없습니다.'}</p>
                </motion.div>

                <div className="detail-item members-section">
                  <h3><Users size={16} /> 참여 프로젝트 멤버</h3>
                  <div className="modal-member-list">
                    {selectedProject.members && selectedProject.members.length > 0 ? (
                      selectedProject.members.map((member, index) => (
                        <motion.div 
                          key={member.id} 
                          className="modal-member-item cursor-pointer"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + (index * 0.05) }}
                          onClick={() => handleMemberClick(member.id)}
                        >
                          <div className="member-avatar-large">
                            {member.avatar ? <img src={member.avatar} alt={member.name} /> : member.name[0]}
                            <span className={`status-dot ${member.status.toLowerCase()}`}></span>
                          </div>
                          <div className="member-info">
                            <div className="member-name">{member.name}</div>
                            <div className="member-role">{member.role}</div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <p className="empty-text">배정된 팀원이 없습니다.</p>
                    )}
                  </div>
                </div>

                <motion.div 
                  className="detail-item progress-section"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h3><Layers size={16} /> 개발 영역 및 진행률</h3>
                  <div className="modal-progress-section">
                    <div className="modal-progress-meta">
                      <span className="area-text">{selectedProject.area}</span>
                      <span className="progress-value">{selectedProject.progress}%</span>
                    </div>
                    <div className="progress-bar-bg larger">
                      <motion.div 
                        className={`progress-bar-fill fill-${selectedProject.status.toLowerCase()}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${selectedProject.progress}%` }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                      ></motion.div>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="modal-footer">
                <button className="action-btn primary" onClick={(e) => { setSelectedProject(null); openEditModal(e, selectedProject); }}>업데이트</button>
                <button className="action-btn outline" onClick={() => setSelectedProject(null)}>닫기</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Project Form Modal (Create/Edit) */}
      <AnimatePresence>
        {showFormModal && (
          <div className="modal-overlay" onClick={() => setShowFormModal(false)}>
            <motion.div 
              className="modal-content glass premium-modal form-modal"
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>{editingProject ? '프로젝트 수정' : '새 프로젝트 추가'}</h2>
                <button className="close-btn" onClick={() => setShowFormModal(false)}><X size={20} /></button>
              </div>
              
              <div className="form-body custom-scrollbar">
                <div className="form-grid">
                  <div className="form-field full">
                    <label><Hash size={14} /> 프로젝트 명</label>
                    <input 
                      type="text" 
                      placeholder="예: AI 비서 영자 고도화"
                      value={projectForm.title}
                      onChange={(e) => setProjectForm({...projectForm, title: e.target.value})}
                      className="glass-input"
                    />
                  </div>
                  <div className="form-field">
                    <label><Users size={14} /> 그룹명</label>
                    <input 
                      type="text" 
                      placeholder="예: Connect AI LAB"
                      value={projectForm.group_name}
                      onChange={(e) => setProjectForm({...projectForm, group_name: e.target.value})}
                      className="glass-input"
                    />
                  </div>
                  <div className="form-field">
                    <label><Layers size={14} /> 개발 영역</label>
                    <input 
                      type="text" 
                      placeholder="예: Frontend, Mobile"
                      value={projectForm.area}
                      onChange={(e) => setProjectForm({...projectForm, area: e.target.value})}
                      className="glass-input"
                    />
                  </div>
                  <div className="form-field full">
                    <label><Circle size={14} /> 현재 작업 내용</label>
                    <textarea 
                      placeholder="무슨 작업을 하고 있나요?"
                      value={projectForm.task}
                      onChange={(e) => setProjectForm({...projectForm, task: e.target.value})}
                      className="glass-input"
                    />
                  </div>
                  <div className="form-field">
                    <label><AlertCircle size={14} /> 현재 상태</label>
                    <select 
                      value={projectForm.status}
                      onChange={(e) => setProjectForm({...projectForm, status: e.target.value})}
                      className="glass-input select-premium"
                    >
                      <option value="Pending">🛡️ 대기</option>
                      <option value="Development">🚀 진행</option>
                      <option value="Review">🔍 검수 중</option>
                      <option value="Launch">🏁 완료</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label><Clock size={14} /> 프로젝트 진행률</label>
                    <div className="slider-wrapper">
                      <input 
                        type="range" 
                        min="0" 
                        max="100"
                        value={projectForm.progress}
                        onChange={(e) => setProjectForm({...projectForm, progress: parseInt(e.target.value)})}
                        className="glass-slider"
                      />
                      <span className="slider-value">{projectForm.progress}%</span>
                    </div>
                  </div>
                  <div className="form-field">
                    <label><Search size={14} /> 검수 예정일</label>
                    <input 
                      type="date" 
                      value={projectForm.inspection_date}
                      onChange={(e) => setProjectForm({...projectForm, inspection_date: e.target.value})}
                      className="glass-input"
                    />
                  </div>
                  <div className="form-field">
                    <label><Calendar size={14} /> 프로젝트 종료일</label>
                    <input 
                      type="date" 
                      value={projectForm.end_date}
                      onChange={(e) => setProjectForm({...projectForm, end_date: e.target.value})}
                      className="glass-input"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  className="action-btn primary" 
                  onClick={handleSaveProject}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '저장 중...' : (editingProject ? '변경사항 저장' : <><Plus size={18} /> 프로젝트 생성</>)}
                </button>
                <button className="action-btn outline" onClick={() => setShowFormModal(false)}>취소</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Team Member Form Modal (Create/Edit) */}
      <AnimatePresence>
        {showMemberModal && (
          <div className="modal-overlay" onClick={() => setShowMemberModal(false)}>
            <motion.div 
              className="modal-content glass premium-modal form-modal"
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>{editingMember ? '멤버 정보 수정' : '새 팀 멤버 초대'}</h2>
                <button className="close-btn" onClick={() => setShowMemberModal(false)}><X size={20} /></button>
              </div>
              
              <div className="form-body custom-scrollbar">
                <div className="form-grid">
                  <div className="form-field">
                    <label>이름</label>
                    <input 
                      type="text" 
                      placeholder="예: 김영자"
                      value={memberForm.name}
                      onChange={(e) => setMemberForm({...memberForm, name: e.target.value})}
                      className="glass-input"
                    />
                  </div>
                  <div className="form-field">
                    <label>역할</label>
                    <select 
                      value={memberForm.role}
                      onChange={(e) => setMemberForm({...memberForm, role: e.target.value})}
                      className="glass-input"
                    >
                      <option value="">역할 선택</option>
                      <option value="기획">기획</option>
                      <option value="디자인">디자인</option>
                      <option value="개발">개발</option>
                      <option value="외부개발자">외부개발자</option>
                    </select>
                  </div>
                  <div className="form-field full">
                    <label>아바타 선택</label>
                    <div className="avatar-picker-container custom-scrollbar">
                      <div className="avatar-picker-grid">
                        {AVATAR_LIST.map((av) => (
                          <div 
                            key={av.id}
                            className={`avatar-picker-item ${memberForm.avatar === av.path ? 'active' : ''}`}
                            onClick={() => setMemberForm({...memberForm, avatar: av.path})}
                            title={av.category}
                          >
                            <img src={av.path} alt={av.id} />
                            {memberForm.avatar === av.path && (
                              <div className="avatar-selected-badge">
                                <Check size={12} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="form-field full">
                    <label>아바타 이미지 URL (또는 직접 입력)</label>
                    <input 
                      type="text" 
                      placeholder="https://..."
                      value={memberForm.avatar}
                      onChange={(e) => setMemberForm({...memberForm, avatar: e.target.value})}
                      className="glass-input"
                    />
                  </div>
                  <div className="form-field full">
                    <label>상태</label>
                    <div className="status-radio-group">
                      {[
                        { val: 'Away', label: '대기' },
                        { val: 'Active', label: '진행' },
                        { val: 'Offline', label: '완료' }
                      ].map(st => (
                        <label key={st.val} className={`status-radio ${memberForm.status === st.val ? 'active' : ''}`}>
                          <input 
                            type="radio" 
                            name="member-status" 
                            value={st.val} 
                            checked={memberForm.status === st.val}
                            onChange={(e) => setMemberForm({...memberForm, status: e.target.value})}
                          />
                          <span className={`dot ${st.val.toLowerCase()}`}></span>
                          {st.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  className="action-btn primary" 
                  onClick={handleSaveMember}
                  disabled={isSubmittingMember}
                >
                  {isSubmittingMember ? '처리 중...' : (editingMember ? '수정 완료' : <><Plus size={18} /> 멤버 초대하기</>)}
                </button>
                <button className="action-btn outline" onClick={() => setShowMemberModal(false)}>취소</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Member Projects Modal */}
      <AnimatePresence>
        {selectedMemberProjects && (
          <div className="modal-overlay" onClick={() => setSelectedMemberProjects(null)}>
            <motion.div 
              className="modal-content glass premium-modal member-projects-modal"
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div className="member-profile-summary">
                  <div className="member-avatar-giant">
                    {selectedMemberProjects.avatar ? <img src={selectedMemberProjects.avatar} alt={selectedMemberProjects.name} /> : selectedMemberProjects.name[0]}
                    <span className={`status-dot-large ${selectedMemberProjects.status.toLowerCase()}`}></span>
                  </div>
                  <div className="member-name-role">
                    <h2>{selectedMemberProjects.name} 대표님</h2>
                    <p>{selectedMemberProjects.role}</p>
                  </div>
                </div>
                <button className="close-btn" onClick={() => setSelectedMemberProjects(null)}><X size={20} /></button>
              </div>

              <div className="modal-body custom-scrollbar">
                <div className="member-projects-section">
                  <h3 className="section-subtitle"><Briefcase size={16} /> 현재 참여 중인 프로젝트</h3>
                  
                  <div className="member-project-list">
                    {selectedMemberProjects.projects.length > 0 ? (
                      selectedMemberProjects.projects.map((project, idx) => (
                        <motion.div 
                          key={project.id} 
                          className={`member-project-item glass-card status-${project.status.toLowerCase()}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                        >
                          <div className="proj-info">
                            <span className="proj-group">{project.group_name}</span>
                            <h4 className="proj-title">{project.title}</h4>
                          </div>
                          <div className="proj-meta">
                            <div className="proj-date">
                              <Calendar size={14} />
                              <span>{project.end_date ? new Date(project.end_date).toLocaleDateString() : '일정 미정'}</span>
                            </div>
                            <div className={`badge badge-${project.status.toLowerCase()} small`}>
                              {statusMap[project.status]}
                            </div>
                          </div>
                          <div className="proj-progress-mini">
                            <div className="progress-bar-bg mini">
                              <div 
                                className={`progress-bar-fill fill-${project.status.toLowerCase()}`}
                                style={{ width: `${project.progress}%` }}
                              />
                            </div>
                            <span className="progress-percentText">{project.progress}%</span>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="empty-projects">
                        <Rocket size={40} className="empty-icon" />
                        <p>현재 참여 중인 프로젝트가 없습니다.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  className="action-btn primary" 
                  onClick={() => {
                    setTaskFilterMemberId(selectedMemberProjects.id);
                    setActiveMenu('tasks');
                    setSelectedMemberProjects(null);
                  }}
                >
                  <CheckSquare size={18} /> 담당 작업 확인하기
                </button>
                <button className="action-btn outline" onClick={() => setSelectedMemberProjects(null)}>닫기</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quick Assign Modal */}
      <AnimatePresence>
        {showAssigneeModal && assigningTask && (
          <div className="modal-overlay" onClick={() => setShowAssigneeModal(false)}>
            <motion.div 
              className="modal-content glass premium-modal quick-assign-modal"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div className="title-with-icon">
                  <UserPlus size={20} className="text-indigo-400" />
                  <div className="header-text">
                    <h2>담당자 배정</h2>
                    <p className="task-ref">#{assigningTask.content.substring(0, 15)}...</p>
                  </div>
                </div>
                <button className="close-btn" onClick={() => setShowAssigneeModal(false)}>
                  <Plus size={20} style={{ transform: 'rotate(45deg)' }} />
                </button>
              </div>
              
              <div className="modal-body custom-scrollbar">
                <p className="modal-subtitle">이 작업에 함께할 팀원들을 선택해 주세요! 🧑‍🤝‍🧑</p>
                <div className="assignee-selector-grid glass-pannel mt-4">
                  {allMembers.map(m => (
                    <div 
                      key={m.id} 
                      className={`assignee-chip-item ${selectedAssigneeIds.includes(String(m.id)) ? 'selected' : ''}`}
                      onClick={() => {
                        const ids = [...selectedAssigneeIds];
                        if (ids.includes(String(m.id))) {
                          setSelectedAssigneeIds(ids.filter(id => id !== String(m.id)));
                        } else {
                          setSelectedAssigneeIds([...ids, String(m.id)]);
                        }
                      }}
                    >
                      <div className="chip-avatar">
                        {m.avatar ? <img src={m.avatar} alt={m.name} /> : m.name[0]}
                      </div>
                      <div className="chip-info">
                        <span className="name">{m.name}</span>
                        <span className="role">{m.role}</span>
                      </div>
                      {selectedAssigneeIds.includes(String(m.id)) && <CheckCircle size={14} className="check-icon" />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button className="action-btn outline" onClick={() => setShowAssigneeModal(false)}>취소</button>
                <button 
                  className="action-btn primary" 
                  onClick={handleSaveQuickAssignees}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '저장 중...' : '배정 완료 ✨'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Category Management Modal */}
      <AnimatePresence>
        {showCategoryModal && (
          <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
            <motion.div 
              className="modal-content glass premium-modal category-modal"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '450px' }}
            >
              <div className="modal-header">
                <div className="title-with-icon">
                  <Hash size={20} className="text-indigo-400" />
                  <h2>{editingCategory ? '카테고리 수정' : '새 카테고리 추가'}</h2>
                </div>
                <button className="close-btn" onClick={() => setShowCategoryModal(false)}>
                  <Plus size={20} style={{ transform: 'rotate(45deg)' }} />
                </button>
              </div>

              <div className="modal-body">
                <div className="form-group mb-4">
                  <label>식별 키 (영문/숫자)</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    placeholder="예: notice, tip, QnA"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    disabled={!!editingCategory}
                  />
                  <p className="input-hint">시스템 내부 식별용이며 수정이 불가능해요.</p>
                </div>
                <div className="form-group mb-4">
                  <label>카테고리 명 (표시용)</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    placeholder="예: 공지사항, 팁/노하우"
                    value={categoryForm.label}
                    onChange={(e) => setCategoryForm({ ...categoryForm, label: e.target.value })}
                  />
                </div>
                <div className="form-group mb-4">
                  <label>포인트 컬러</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input 
                      type="color" 
                      value={categoryForm.color}
                      onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                      style={{ width: '50px', height: '40px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                    />
                    <input 
                      type="text" 
                      className="glass-input" 
                      value={categoryForm.color}
                      onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button className="action-btn outline" onClick={() => setShowCategoryModal(false)}>취소</button>
                <button 
                  className="action-btn primary" 
                  onClick={handleSaveCategory}
                  disabled={isSubmittingCategory}
                >
                  {isSubmittingCategory ? '저장 중...' : (editingCategory ? '수정 완료 👍' : '등록하기 🚀')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Member Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && memberToDelete && (
          <div className="modal-overlay danger-mood" onClick={() => setShowDeleteConfirm(false)}>
            <motion.div 
              className="modal-content glass premium-modal delete-confirm-modal"
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '420px', textAlign: 'center' }}
            >
              <div className="modal-decoration">
                <div className="glow-orb red"></div>
              </div>
              
              <div className="modal-header-centered">
                <div className="warning-icon-wrapper">
                  <AlertTriangle size={36} className="text-red-500" />
                </div>
                <h2>팀원 삭제 확인</h2>
                <p className="modal-subtitle">정말 이 팀원과 작별하시겠습니까? 😢</p>
              </div>

              <div className="modal-body">
                <div className="target-member-preview">
                  <div className="member-avatar-large">
                    {memberToDelete.avatar ? <img src={memberToDelete.avatar} alt={memberToDelete.name} /> : memberToDelete.name[0]}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">{memberToDelete.name}</h3>
                  <p className="text-sm text-gray-400">{memberToDelete.role}</p>
                </div>
                
                <div className="mt-6 px-8">
                  <p className="text-xs text-red-400 opacity-70 leading-relaxed">
                    ⚠️ 삭제 시 모든 배정된 업무에서도 제외되며,<br/>이 작업은 되돌릴 수 없습니다.
                  </p>
                </div>
              </div>

              <div className="modal-footer danger-footer">
                <button 
                  className="action-btn outline" 
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  취소
                </button>
                <button 
                  className="action-btn primary danger-btn" 
                  onClick={confirmDeleteMember}
                  disabled={loading}
                >
                  {loading ? '처리 중...' : '삭제하기'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
          </div> // closes dashboard-container
        )} {/* closes ternary */}
      </AnimatePresence>
    </>
  );
};

export default App;
