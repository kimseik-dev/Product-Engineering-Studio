import React, { useState, useMemo, lazy, Suspense } from 'react';
import { statusMap, BLOCKING_STATUSES, AVATAR_LIST, emptyProjectForm } from './lib/constants';
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
  Check,
  CalendarClock,
  NotebookPen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './lib/supabase';
import PhaseTimeline, { getProjectPhaseStatus } from './components/PhaseTimeline';
import ProjectDetailModal from './components/ProjectDetailModal';
import ProjectFormModal from './components/ProjectFormModal';
import MemberFormModal from './components/MemberFormModal';
import MemberProjectsModal from './components/modals/MemberProjectsModal';
import AssigneeSelectModal from './components/modals/AssigneeSelectModal';
import CategoryModal from './components/modals/CategoryModal';
import DeleteMemberConfirmModal from './components/modals/DeleteMemberConfirmModal';
import AvailabilityView from './views/AvailabilityView';
import TeamView from './views/TeamView';
import SettingsView from './views/SettingsView';
import DashboardView from './views/DashboardView';
import ProjectsListView from './views/ProjectsListView';

// 무거운 뷰는 지연 로드 → 초기 번들 축소
const TaskBoard = lazy(() => import('./components/TaskBoard'));
const IssueTracker = lazy(() => import('./components/IssueTracker'));
const ShareBoard = lazy(() => import('./components/ShareBoard'));
const WritingPage = lazy(() => import('./components/WritingPage'));
const DailyLog = lazy(() => import('./components/DailyLog'));
const CompletedProjects = lazy(() => import('./components/CompletedProjects'));

const PhaseBadge = ({ project, size = 'normal' }) => {
  const status = getProjectPhaseStatus(project);
  if (status.state === 'empty') return null;

  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: size === 'small' ? '2px 8px' : '3px 10px',
    borderRadius: 999,
    fontSize: size === 'small' ? 10 : 11,
    fontWeight: 700,
    border: '1px solid',
    whiteSpace: 'nowrap',
  };

  if (status.state === 'active') {
    const urgent = status.daysLeft <= 2;
    return (
      <span style={{
        ...base,
        background: `${status.phase.color}22`,
        color: status.phase.color,
        borderColor: `${status.phase.color}55`,
      }}>
        {status.phase.emoji} {status.phase.label} 중
        {urgent && <span style={{ opacity: 0.75 }}> · D-{status.daysLeft}</span>}
      </span>
    );
  }
  if (status.state === 'overdue') {
    return (
      <span style={{
        ...base,
        background: 'rgba(248,113,113,0.14)',
        color: '#fca5a5',
        borderColor: 'rgba(248,113,113,0.4)',
      }}>
        ⚠️ {status.phase.label} 지연 {status.daysOver}일
      </span>
    );
  }
  if (status.state === 'upcoming') {
    return (
      <span style={{
        ...base,
        background: 'rgba(96,165,250,0.1)',
        color: '#93c5fd',
        borderColor: 'rgba(96,165,250,0.25)',
      }}>
        {status.phase.emoji} {status.phase.label} D-{status.daysUntil}
      </span>
    );
  }
  if (status.state === 'completed') {
    return (
      <span style={{
        ...base,
        background: 'rgba(74,222,128,0.1)',
        color: '#86efac',
        borderColor: 'rgba(74,222,128,0.25)',
      }}>
        ✅ 단계 완료
      </span>
    );
  }
  return null;
};
import { Toaster, toast } from 'react-hot-toast';
import './App.css';


const App = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [taskFilterMemberId, setTaskFilterMemberId] = useState('All');
  const [showCompleted, setShowCompleted] = useState(true);
  const [availabilityBasis, setAvailabilityBasis] = useState('auto'); // auto | development | inspection

  // Writing Page States
  const [isWritingContent, setIsWritingContent] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  // CRUD States (Projects)
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectForm, setProjectForm] = useState(emptyProjectForm);

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
    setProjectForm(emptyProjectForm);
    setShowFormModal(true);
  };

  const openEditModal = (e, project) => {
    e?.stopPropagation();
    setEditingProject(project);
    const toISOField = (v) => (v ? String(v).split('T')[0] : '');
    setProjectForm({
      title: project.title,
      group_name: project.group_name,
      task: project.task || '',
      status: project.status,
      area: project.area,
      progress: project.progress,
      end_date: toISOField(project.end_date),
      inspection_date: toISOField(project.inspection_date),
      planning_start: toISOField(project.planning_start),
      planning_end: toISOField(project.planning_end),
      design_start: toISOField(project.design_start),
      design_end: toISOField(project.design_end),
      development_start: toISOField(project.development_start),
      development_end: toISOField(project.development_end),
      test_start: toISOField(project.test_start),
      test_end: toISOField(project.test_end),
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
      const toNull = (v) => (v === '' || v == null ? null : v);
      const payload = {
        ...projectForm,
        end_date: toNull(projectForm.end_date),
        inspection_date: toNull(projectForm.inspection_date),
        planning_start: toNull(projectForm.planning_start),
        planning_end: toNull(projectForm.planning_end),
        design_start: toNull(projectForm.design_start),
        design_end: toNull(projectForm.design_end),
        development_start: toNull(projectForm.development_start),
        development_end: toNull(projectForm.development_end),
        test_start: toNull(projectForm.test_start),
        test_end: toNull(projectForm.test_end),
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
    { label: '기획', value: projects.filter(p => p.status === 'Planning').length, color: 'linear-gradient(135deg, #a78bfa, #c4b5fd)' },
    { label: '디자인', value: projects.filter(p => p.status === 'Design').length, color: 'linear-gradient(135deg, #f472b6, #f9a8d4)' },
    { label: '개발', value: projects.filter(p => p.status === 'Development').length, color: 'var(--info-gradient)' },
    { label: '검수', value: projects.filter(p => p.status === 'Review').length, color: 'var(--primary-gradient)' },
    { label: '출시', value: projects.filter(p => p.status === 'Launch').length, color: 'var(--success-gradient)' },
  ];

  // 검수(Review) 단계는 개발 리소스를 거의 안 쓰므로, Development 상태 프로젝트만 가용성 블로커로 취급.
  const memberAvailability = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows = allMembers.map(member => {
      const blockingProjects = projects.filter(p =>
        BLOCKING_STATUSES.includes(p.status) &&
        (p.members || []).some(m => String(m.id) === String(member.id))
      );

      const dated = [];
      const undated = [];
      blockingProjects.forEach(p => {
        let raw;
        if (availabilityBasis === 'development') {
          raw = p.development_end || p.inspection_date || p.end_date;
        } else if (availabilityBasis === 'inspection') {
          raw = p.inspection_date || p.end_date;
        } else {
          // auto: 단계 정보가 있으면 개발 종료일 우선, 없으면 기존 로직
          raw = p.development_end || p.inspection_date || p.end_date;
        }
        if (raw) dated.push({ project: p, date: new Date(raw) });
        else undated.push(p);
      });

      const latest = dated.length
        ? dated.reduce((a, b) => (a.date > b.date ? a : b))
        : null;

      const availableDate = latest ? latest.date : null;
      const isAvailableNow = !availableDate || availableDate <= today;

      return {
        member,
        availableDate,
        isAvailableNow,
        blockingProjects,
        datedProjects: dated,
        undatedProjects: undated,
      };
    });

    rows.sort((a, b) => {
      if (a.isAvailableNow && !b.isAvailableNow) return -1;
      if (!a.isAvailableNow && b.isAvailableNow) return 1;
      if (!a.availableDate) return -1;
      if (!b.availableDate) return 1;
      return a.availableDate - b.availableDate;
    });

    return rows;
  }, [projects, allMembers, availabilityBasis]);

  const menuItems = [
    { id: 'dashboard', label: '대시보드', icon: LayoutDashboard, category: 'work' },
    { id: 'projects', label: '프로젝트', icon: Briefcase, category: 'work' },
    { id: 'tasks', label: '작업', icon: CheckSquare, category: 'work' },
    { id: 'daily', label: '일일 업무', icon: NotebookPen, category: 'work' },
    { id: 'issues', label: '이슈', icon: AlertTriangle, category: 'work' },
    { id: 'availability', label: '팀 가용성', icon: CalendarClock, category: 'work' },
    { id: 'completed', label: '완료된 프로젝트', icon: CheckCircle, category: 'work' },
    { id: 'knowledge', label: '정보 공유', icon: MessageSquare, category: 'community' },
    { id: 'team', label: '팀', icon: Users, category: 'community' },
    { id: 'settings', label: '설정', icon: Settings, category: 'system' },
  ];

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return (
          <DashboardView
            stats={stats}
            loading={loading}
            errorStatus={errorStatus}
            showCompleted={showCompleted}
            onToggleCompleted={() => setShowCompleted(!showCompleted)}
            filter={filter}
            onFilterChange={setFilter}
            filteredProjects={filteredProjects}
            onSelectProject={setSelectedProject}
            onEdit={openEditModal}
            onDelete={handleDeleteProject}
            PhaseBadge={PhaseBadge}
          />
        );
      case 'projects':
        return (
          <ProjectsListView
            filteredProjects={filteredProjects}
            showCompleted={showCompleted}
            onToggleCompleted={() => setShowCompleted(!showCompleted)}
            filter={filter}
            onFilterChange={setFilter}
            onSelectProject={setSelectedProject}
            onEdit={openEditModal}
            onDelete={handleDeleteProject}
            onMemberClick={handleMemberClick}
          />
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
          <TeamView
            allMembers={allMembers}
            projects={projects}
            onMemberClick={handleMemberClick}
            onEdit={openEditMemberModal}
            onDelete={handleDeleteMember}
            onCreate={openCreateMemberModal}
          />
        );
      case 'settings':
        return (
          <SettingsView
            categories={categories}
            onCreate={() => {
              setEditingCategory(null);
              setCategoryForm({ name: '', label: '', color: '#6366f1' });
              setShowCategoryModal(true);
            }}
            onEdit={(cat) => {
              setEditingCategory(cat);
              setCategoryForm({ name: cat.name, label: cat.label, color: cat.color || '#6366f1' });
              setShowCategoryModal(true);
            }}
            onDelete={handleDeleteCategory}
          />
        );
      case 'daily':
        return (
          <DailyLog members={allMembers} projects={projects} />
        );
      case 'availability':
        return (
          <AvailabilityView
            memberAvailability={memberAvailability}
            availabilityBasis={availabilityBasis}
            onBasisChange={setAvailabilityBasis}
          />
        );
      case 'completed':
        return (
          <CompletedProjects
            projects={projects}
            onProjectClick={(p) => setSelectedProject(p)}
            onEdit={(e, p) => openEditModal(e, p)}
            onDelete={(e, id) => handleDeleteProject(e, id)}
            onMemberClick={handleMemberClick}
          />
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
            <Suspense fallback={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 12 }}>
                <div className="loading-spinner" />
                <span style={{ opacity: 0.5, fontSize: 13 }}>불러오는 중...</span>
              </div>
            }>
              {renderContent()}
            </Suspense>
          </React.Fragment>
        </AnimatePresence>
      </main>

      {/* Project Detail Modal */}
      <ProjectDetailModal
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
        onEdit={openEditModal}
        onDelete={handleDeleteProject}
        onMemberClick={handleMemberClick}
      />

      <ProjectFormModal
        show={showFormModal}
        editing={editingProject}
        form={projectForm}
        setForm={setProjectForm}
        isSubmitting={isSubmitting}
        onSave={handleSaveProject}
        onClose={() => setShowFormModal(false)}
      />

      <MemberFormModal
        show={showMemberModal}
        editing={editingMember}
        form={memberForm}
        setForm={setMemberForm}
        isSubmitting={isSubmittingMember}
        onSave={handleSaveMember}
        onClose={() => setShowMemberModal(false)}
      />

      <MemberProjectsModal
        member={selectedMemberProjects}
        onClose={() => setSelectedMemberProjects(null)}
        onGoToTasks={(id) => {
          setTaskFilterMemberId(id);
          setActiveMenu('tasks');
          setSelectedMemberProjects(null);
        }}
      />

      <AssigneeSelectModal
        show={showAssigneeModal}
        task={assigningTask}
        members={allMembers}
        selectedIds={selectedAssigneeIds}
        setSelectedIds={setSelectedAssigneeIds}
        isSubmitting={isSubmitting}
        onSave={handleSaveQuickAssignees}
        onClose={() => setShowAssigneeModal(false)}
      />

      <CategoryModal
        show={showCategoryModal}
        editing={editingCategory}
        form={categoryForm}
        setForm={setCategoryForm}
        isSubmitting={isSubmittingCategory}
        onSave={handleSaveCategory}
        onClose={() => setShowCategoryModal(false)}
      />

      <DeleteMemberConfirmModal
        show={showDeleteConfirm}
        member={memberToDelete}
        loading={loading}
        onConfirm={confirmDeleteMember}
        onClose={() => setShowDeleteConfirm(false)}
      />
          </div> // closes dashboard-container
        )} {/* closes ternary */}
      </AnimatePresence>
    </>
  );
};

export default App;
