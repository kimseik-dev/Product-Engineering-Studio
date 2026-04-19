import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  MoreVertical,
  Clock,
  AlertCircle,
  CheckCircle,
  Circle,
  User,
  Hash,
  Filter,
  Trash2,
  AlertTriangle,
  UserPlus,
  Search,
  X,
  Flame
} from 'lucide-react';

const statuses = ['To Do', 'In Progress', 'Review', 'Done'];
const statusLabels = {
  'To Do': '대기',
  'In Progress': '진행',
  'Review': '검수 중',
  'Done': '완료'
};
const statusColors = {
  'To Do': 'rgba(255, 255, 255, 0.7)',
  'In Progress': 'var(--info-gradient)',
  'Review': 'var(--primary-gradient)',
  'Done': 'var(--success-gradient)'
};

const priorityIcons = {
  'High': <AlertCircle size={14} className="text-red" />,
  'Medium': <Clock size={14} className="text-orange" />,
  'Low': <Circle size={14} className="text-blue" />
};

const getDueUrgency = (dateStr) => {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due - today) / 86400000);
  if (days < 0) return { kind: 'overdue', days: -days, label: `${-days}일 지남`, color: '#f87171', bg: 'rgba(248,113,113,0.14)', border: 'rgba(248,113,113,0.35)' };
  if (days === 0) return { kind: 'today', days: 0, label: '오늘 마감', color: '#fb923c', bg: 'rgba(251,146,60,0.18)', border: 'rgba(251,146,60,0.4)' };
  if (days <= 3) return { kind: 'urgent', days, label: `D-${days}`, color: '#fb923c', bg: 'rgba(251,146,60,0.1)', border: 'rgba(251,146,60,0.25)' };
  if (days <= 7) return { kind: 'soon', days, label: `D-${days}`, color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' };
  return { kind: 'normal', days, label: `D-${days}`, color: 'rgba(255,255,255,0.65)', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.06)' };
};

const TaskBoard = ({ members = [], projects = [], initialMemberId = 'All', onProjectUpdate, onQuickAssign }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(initialMemberId);
  const [selectedProject, setSelectedProject] = useState('All');
  const [viewMode, setViewMode] = useState('swimlane'); // 'board' or 'swimlane'
  const [hoveredMemberId, setHoveredMemberId] = useState(null); // For Drag & Drop
  const [hoveredStatus, setHoveredStatus] = useState(null);     // For drag-to-column status change
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_desc');
  const [progressEditingId, setProgressEditingId] = useState(null);
  const [progressDraft, setProgressDraft] = useState(0);
  
  // Update local selector if prop changes
  useEffect(() => {
    setSelectedMember(initialMemberId);
  }, [initialMemberId]);

  // Task CRUD State
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskForm, setTaskForm] = useState({
    content: '',
    status: 'To Do',
    priority: 'Medium',
    due_date: '',
    project_id: '',
    assignee_ids: [],
    progress: 0
  });

  // Delete Confirmation State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  useEffect(() => {
    fetchTasks();
    
    const taskChannel = supabase.channel('task_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchTasks())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignees' }, () => fetchTasks())
      .subscribe();

    return () => {
      supabase.removeChannel(taskChannel);
    };
  }, []);

  // Sync tasks when projects prop updates from App.jsx
  useEffect(() => {
    fetchTasks();
  }, [projects]);

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*, assignees:members(*), project:projects(*)')
      .order('created_at', { ascending: false });

    if (!error) {
      setTasks(data || []);
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId);
    
    if (error) alert('상태 변경 중 오류가 발생했어요! 😅');
  };

  const handleTaskDragEnd = async (task, info) => {
    setIsDragging(false);
    const capturedStatus = hoveredStatus;
    const capturedMember = hoveredMemberId;
    setHoveredStatus(null);
    setHoveredMemberId(null);

    const statusChanged = capturedStatus && capturedStatus !== task.status;
    const assigneeChanged = !!capturedMember;

    if (!statusChanged && !assigneeChanged) return;

    // Optimistic update
    setTasks(prev => prev.map(t => {
      if (t.id !== task.id) return t;
      const next = { ...t };
      if (statusChanged) next.status = capturedStatus;
      if (assigneeChanged) {
        next.assignees = capturedMember === 'Unassigned'
          ? []
          : (members.filter(m => String(m.id) === String(capturedMember)));
      }
      return next;
    }));

    try {
      if (statusChanged) {
        const { error } = await supabase.from('tasks').update({ status: capturedStatus }).eq('id', task.id);
        if (error) throw error;
      }
      if (assigneeChanged) {
        const newAssigneeIds = capturedMember === 'Unassigned' ? [] : [parseInt(capturedMember)];
        await supabase.from('task_assignees').delete().eq('task_id', task.id);
        if (newAssigneeIds.length > 0) {
          await supabase.from('task_assignees').insert(newAssigneeIds.map(id => ({ member_id: id, task_id: task.id })));
        }
      }
      const msgs = [];
      if (statusChanged) msgs.push(`→ ${statusLabels[capturedStatus]}`);
      if (assigneeChanged) msgs.push(capturedMember === 'Unassigned' ? '배정 해제' : '배정 변경');
      toast.success(msgs.join(' · '));
      fetchTasks();
    } catch (error) {
      toast.error('변경 중 오류가 발생했어요.');
      fetchTasks();
    }
  };

  const handleQuickUpdatePriority = async (taskId, newPriority) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, priority: newPriority } : t));
    const { error } = await supabase.from('tasks').update({ priority: newPriority }).eq('id', taskId);
    if (error) { toast.error('우선순위 변경 오류'); fetchTasks(); }
  };

  const handleQuickUpdateProgress = async (taskId, newProgress) => {
    const clamped = Math.max(0, Math.min(100, newProgress));
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, progress: clamped } : t));
    const { error } = await supabase.from('tasks').update({ progress: clamped }).eq('id', taskId);
    if (error) { toast.error('진도 변경 오류'); fetchTasks(); }
  };

  const openCreateModal = (initialStatus = 'To Do') => {
    setEditingTask(null);
    setTaskForm({
      content: '',
      status: initialStatus,
      priority: 'Medium',
      due_date: '',
      project_id: projects[0]?.id || '',
      assignee_ids: [],
      progress: 0
    });
    setShowTaskModal(true);
  };

  const openAssigneeModal = (task) => {
    if (onQuickAssign) onQuickAssign(task);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setTaskForm({
      content: task.content,
      status: task.status,
      priority: task.priority,
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      project_id: task.project_id,
      assignee_ids: task.assignees ? task.assignees.map(m => String(m.id)) : [],
      progress: task.progress || 0
    });
    setShowTaskModal(true);
  };

  const handleSaveTask = async () => {
    if (!taskForm.content || !taskForm.project_id) {
      alert('작업 내용과 프로젝트는 필수입니다~ 대표님! 😅');
      return;
    }

    try {
      setIsSubmitting(true);
      const { assignee_ids, ...taskData } = taskForm;
      const payload = { ...taskData, due_date: taskForm.due_date || null };
      let taskId = editingTask?.id;

      if (editingTask) {
        const { error } = await supabase.from('tasks').update(payload).eq('id', editingTask.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('tasks').insert([payload]).select().single();
        if (error) throw error;
        taskId = data.id;
      }

      if (taskId) {
        await supabase.from('task_assignees').delete().eq('task_id', taskId);
        if (taskForm.assignee_ids.length > 0) {
          const relations = taskForm.assignee_ids.map(mId => ({ member_id: mId, task_id: taskId }));
          const { error } = await supabase.from('task_assignees').insert(relations);
          if (error) throw error;
        }
      }

      if (taskForm.assignee_ids.length > 0 && taskForm.project_id) {
        for (const mId of taskForm.assignee_ids) {
          const { data: existingRelation } = await supabase.from('project_members').select('*').eq('member_id', mId).eq('project_id', taskForm.project_id).maybeSingle();
          if (!existingRelation) await supabase.from('project_members').insert([{ member_id: mId, project_id: taskForm.project_id }]);
        }
      }

      setShowTaskModal(false);
      fetchTasks();
      if (onProjectUpdate) onProjectUpdate();
    } catch (error) {
      alert(`작업 저장 중 오류가 발생했어요: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteTask = (task) => {
    setTaskToDelete(task);
    setShowDeleteModal(true);
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      setIsSubmitting(true);
      const { error } = await supabase.from('tasks').delete().eq('id', taskToDelete.id);
      if (error) throw error;
      setShowDeleteModal(false);
      setTaskToDelete(null);
      fetchTasks();
    } catch (error) {
      alert(`삭제 중 오류가 발생했어요: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const q = searchQuery.trim().toLowerCase();

  const sortTasks = (arr) => {
    const list = [...arr];
    switch (sortBy) {
      case 'due_asc':
        return list.sort((a, b) => {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date) - new Date(b.due_date);
        });
      case 'priority_desc': {
        const order = { High: 0, Medium: 1, Low: 2 };
        return list.sort((a, b) => (order[a.priority] ?? 99) - (order[b.priority] ?? 99));
      }
      case 'created_asc':
        return list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      case 'created_desc':
      default:
        return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  };

  const filteredTasks = sortTasks(tasks.filter(t => {
    const memberMatch = selectedMember === 'All' || (Array.isArray(t.assignees) && t.assignees.some(m => String(m.id) === String(selectedMember)));
    const projectMatch = selectedProject === 'All' || String(t.project_id) === String(selectedProject);
    const searchMatch = !q ||
      (t.content && t.content.toLowerCase().includes(q)) ||
      (t.project?.title && t.project.title.toLowerCase().includes(q)) ||
      (Array.isArray(t.assignees) && t.assignees.some(a => a.name && a.name.toLowerCase().includes(q)));
    return memberMatch && projectMatch && searchMatch;
  }));

  const membersWithTasks = members.map(m => {
    const memberTasks = sortTasks(tasks.filter(t => {
      const assignedToMe = Array.isArray(t.assignees) && t.assignees.some(assignee => String(assignee.id) === String(m.id));
      const projectMatch = selectedProject === 'All' || String(t.project_id) === String(selectedProject);
      const searchMatch = !q ||
        (t.content && t.content.toLowerCase().includes(q)) ||
        (t.project?.title && t.project.title.toLowerCase().includes(q));
      return assignedToMe && projectMatch && searchMatch;
    }));

    const memberProgress = memberTasks.length > 0
      ? Math.round(memberTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / memberTasks.length)
      : 0;

    const statusCounts = {
      'To Do': 0,
      'In Progress': 0,
      'Review': 0,
      'Done': 0,
    };
    let overdueCount = 0;
    memberTasks.forEach(t => {
      if (statusCounts[t.status] !== undefined) statusCounts[t.status]++;
      if (t.status !== 'Done' && getDueUrgency(t.due_date)?.kind === 'overdue') overdueCount++;
    });

    return {
      ...m,
      tasks: memberTasks,
      memberProgress,
      statusCounts,
      overdueCount,
    };
  }).filter(m => selectedMember === 'All' || String(m.id) === String(selectedMember));

  const unassignedTasks = sortTasks(tasks.filter(t => {
    const noAssignee = !Array.isArray(t.assignees) || t.assignees.length === 0;
    const projectMatch = selectedProject === 'All' || String(t.project_id) === String(selectedProject);
    const searchMatch = !q ||
      (t.content && t.content.toLowerCase().includes(q)) ||
      (t.project?.title && t.project.title.toLowerCase().includes(q));
    return noAssignee && projectMatch && searchMatch;
  }));

  const renderTaskCard = (task) => {
    const urgency = getDueUrgency(task.due_date);
    const isProgressEditing = progressEditingId === task.id;
    const isUnassigned = !Array.isArray(task.assignees) || task.assignees.length === 0;

    return (
      <motion.div
        key={task.id}
        layout
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={(e, info) => handleTaskDragEnd(task, info)}
        whileDrag={{
          scale: 1.05,
          zIndex: 1000,
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
        }}
        className={`task-card glass card-glow group ${isUnassigned ? 'task-unassigned' : ''} ${urgency?.kind === 'overdue' ? 'task-overdue' : ''}`}
        onClick={() => !isDragging && openEditModal(task)}
      >
        <div className="task-card-header">
          {/* 우선순위 인라인 셀렉트 */}
          <div className="priority-select-wrap" onClick={(e) => e.stopPropagation()}>
            <select
              className={`priority-tag priority-select ${task.priority.toLowerCase()}`}
              value={task.priority}
              onChange={(e) => handleQuickUpdatePriority(task.id, e.target.value)}
              title="우선순위 변경"
            >
              <option value="High">🔴 High</option>
              <option value="Medium">🟡 Medium</option>
              <option value="Low">🔵 Low</option>
            </select>
          </div>

          <div className="card-actions-overlay opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            {isUnassigned && (
              <button
                className="icon-btn xs assign"
                onClick={(e) => { e.stopPropagation(); openAssigneeModal(task); }}
                title="담당자 배정"
              >
                <UserPlus size={14} />
              </button>
            )}
            <button
              className="icon-btn xs delete"
              onClick={(e) => { e.stopPropagation(); confirmDeleteTask(task); }}
              title="삭제"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <h4 className="task-card-title">{task.content}</h4>

        <div className="task-card-footer-container flex flex-col mt-auto">
          <div className="task-card-footer">
            <div className="task-project">
              <Hash size={12} /> {task.project?.title || 'Unknown'}
            </div>
            <div className="task-assignees-avatars">
              {isUnassigned ? (
                <div
                  className="no-assignee-v2"
                  title="담당자 없음 — 클릭해서 배정"
                  onClick={(e) => { e.stopPropagation(); openAssigneeModal(task); }}
                  style={{ cursor: 'pointer' }}
                >
                  <User size={12} className="opacity-40" />
                </div>
              ) : (
                task.assignees.map(m => (
                  <div key={m.id} className="mini-avatar" title={m.name}>
                    {m.avatar ? <img src={m.avatar} alt={m.name} /> : m.name[0]}
                  </div>
                ))
              )}
            </div>
            {task.due_date && urgency && (
              <div
                className="task-due-badge"
                style={{
                  color: urgency.color,
                  background: urgency.bg,
                  border: `1px solid ${urgency.border}`,
                  fontWeight: urgency.kind === 'normal' ? 500 : 700,
                }}
                title={new Date(task.due_date).toLocaleDateString('ko-KR')}
              >
                {urgency.kind === 'overdue' ? <Flame size={11} /> : <Clock size={11} />}
                {urgency.label}
              </div>
            )}
          </div>

          {/* 진도율 - 클릭으로 인라인 편집 */}
          <div
            className="task-card-progress-wrapper mt-3 pt-2 border-t border-white/5"
            onClick={(e) => {
              e.stopPropagation();
              if (!isProgressEditing) {
                setProgressDraft(task.progress || 0);
                setProgressEditingId(task.id);
              }
            }}
            style={{ cursor: isProgressEditing ? 'default' : 'pointer' }}
          >
            <div className="flex justify-between text-[10px] opacity-60 mb-1.5 font-medium">
              <span>진도율</span>
              <span>{isProgressEditing ? progressDraft : (task.progress || 0)}%</span>
            </div>

            {isProgressEditing ? (
              <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progressDraft}
                  onChange={(e) => setProgressDraft(parseInt(e.target.value))}
                  style={{ flex: 1, accentColor: '#6366f1' }}
                  autoFocus
                />
                <button
                  className="icon-btn xs"
                  onClick={async () => {
                    await handleQuickUpdateProgress(task.id, progressDraft);
                    setProgressEditingId(null);
                  }}
                  title="저장"
                  style={{ color: '#4ade80' }}
                >
                  <CheckCircle size={14} />
                </button>
                <button
                  className="icon-btn xs"
                  onClick={() => setProgressEditingId(null)}
                  title="취소"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="task-progress-track bg-white/5 rounded-full h-1.5 overflow-hidden">
                <div
                  className="task-progress-fill h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${task.progress || 0}%`,
                    background: (task.progress || 0) >= 100 ? 'var(--success-gradient)' : 'var(--info-gradient)'
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="task-board-container">
      <div className="board-header glass">
        <div className="board-header-top">
          <div className="board-header-left">
            <h2>✅ 작업 칸반 보드</h2>
            <div className="view-toggles">
              <button 
                className={`toggle-btn ${viewMode === 'board' ? 'active' : ''}`}
                onClick={() => setViewMode('board')}
              >보드 뷰</button>
              <button 
                className={`toggle-btn ${viewMode === 'swimlane' ? 'active' : ''}`}
                onClick={() => setViewMode('swimlane')}
              >스윔레인 (사용자별)</button>
            </div>
          </div>
          <div className="board-header-right">
            {/* 검색창 */}
            <div className="taskboard-search">
              <Search size={14} style={{ opacity: 0.6 }} />
              <input
                type="text"
                placeholder="작업 · 프로젝트 · 담당자 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="taskboard-search-clear" onClick={() => setSearchQuery('')} title="지우기">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* 정렬 */}
            <div className="taskboard-sort">
              <span className="sort-label">정렬</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
                <option value="created_desc">🆕 최신 등록순</option>
                <option value="created_asc">🕰️ 오래된 순</option>
                <option value="due_asc">⏰ 마감 임박순</option>
                <option value="priority_desc">🔥 우선순위 높은 순</option>
              </select>
            </div>

            <div className="member-filters">
              <span className="filter-label"><Filter size={16} /> 담당자:</span>
              <div 
                className={`filter-avatar ${selectedMember === 'All' ? 'active' : ''}`}
                onClick={() => setSelectedMember('All')}
                title="전체 보기"
              >전체</div>
              {members.map(m => (
                <div 
                  key={m.id}
                  className={`filter-avatar ${selectedMember === String(m.id) ? 'active' : ''}`}
                  onClick={() => setSelectedMember(String(m.id))}
                  title={m.name}
                >
                  {m.avatar ? <img src={m.avatar} alt={m.name} /> : m.name[0]}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="board-header-projects-wide glass">
        <div className="project-filters-expanded">
          <div className="project-filters-header">
            <div className="filter-title"><Hash size={18} /> 프로젝트 신속 이동</div>
            <div className="filter-subtitle">원하는 프로젝트를 선택하여 작업을 필터링하세요.</div>
          </div>
          <div className="project-chips-wrapper">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`filter-project-chip ${selectedProject === 'All' ? 'active' : ''}`}
              onClick={() => setSelectedProject('All')}
            >
              🚀 전체 프로젝트
            </motion.div>
            {projects.map(p => (
              <motion.div 
                key={p.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`filter-project-chip ${selectedProject === String(p.id) ? 'active' : ''}`}
                onClick={() => setSelectedProject(String(p.id))}
                title={p.title}
              >
                {p.title}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="board-content custom-scrollbar">
        {viewMode === 'board' ? (
          <div className="kanban-grid">
            {statuses.map(status => {
              const tasksInStatus = filteredTasks.filter(t => t.status === status);
              const unassignedInStatus = tasksInStatus.filter(t => !Array.isArray(t.assignees) || t.assignees.length === 0).length;
              return (
              <div
                key={status}
                className={`kanban-column glass ${isDragging && hoveredStatus === status ? 'drop-active-status' : ''}`}
                onMouseEnter={() => isDragging && setHoveredStatus(status)}
                onMouseLeave={() => setHoveredStatus(prev => prev === status ? null : prev)}
              >
                <div className="column-header">
                  <h3 style={{ color: statusColors[status].includes('var') ? statusColors[status] : undefined }}>
                    {statusLabels[status]}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {unassignedInStatus > 0 && status !== 'Done' && (
                      <span className="column-unassigned-badge" title={`미배정 ${unassignedInStatus}개`}>
                        미배정 {unassignedInStatus}
                      </span>
                    )}
                    <span className="task-count">
                      {tasksInStatus.length}
                    </span>
                  </div>
                </div>
                <div className="column-tasks">
                  {selectedProject === 'All' ? (
                    projects.map(project => {
                      const projectTasks = filteredTasks.filter(t => t.status === status && String(t.project_id) === String(project.id));
                      if (projectTasks.length === 0) return null;
                      return (
                        <div key={project.id} className="project-group-container">
                          <div className="project-group-header">
                            <Hash size={12} /> {project.title}
                          </div>
                          <AnimatePresence>
                            {projectTasks.map(renderTaskCard)}
                          </AnimatePresence>
                        </div>
                      );
                    }).concat(
                      filteredTasks.filter(t => t.status === status && !projects.some(p => String(p.id) === String(t.project_id))).length > 0 ? (
                        <div key="unknown" className="project-group-container">
                          <div className="project-group-header">
                            <Hash size={12} /> Unknown Project
                          </div>
                          <AnimatePresence>
                            {filteredTasks.filter(t => t.status === status && !projects.some(p => String(p.id) === String(t.project_id))).map(renderTaskCard)}
                          </AnimatePresence>
                        </div>
                      ) : []
                    )
                  ) : (
                    <AnimatePresence>
                      {filteredTasks.filter(t => t.status === status).map(renderTaskCard)}
                    </AnimatePresence>
                  )}
                  <button className="add-task-inline" onClick={() => openCreateModal(status)}><Plus size={16} /> 작업 추가</button>
                </div>
              </div>
            );})}
          </div>
        ) : (
          <div className="swimlane-container">
            {unassignedTasks.length > 0 && (
              <div 
                className={`swimlane-row glass ${hoveredMemberId === 'Unassigned' ? 'drop-active' : ''}`}
                onMouseEnter={() => setHoveredMemberId('Unassigned')}
                onMouseLeave={() => setHoveredMemberId(null)}
              >
                <div className="swimlane-header">
                  <div className="member-info">
                    <div className="avatar-circle empty"><User size={16} /></div>
                    <span>배정되지 않음</span>
                  </div>
                </div>
                <div className="kanban-grid row-grid">
                  {statuses.map(status => (
                    <div
                      key={status}
                      className={`kanban-column-compact ${isDragging && hoveredStatus === status ? 'drop-active-status' : ''}`}
                      onMouseEnter={() => isDragging && setHoveredStatus(status)}
                      onMouseLeave={() => setHoveredStatus(prev => prev === status ? null : prev)}
                    >
                      {unassignedTasks.filter(t => t.status === status).map(renderTaskCard)}
                      <button className="add-task-inline mini" onClick={() => openCreateModal(status)} title="작업 추가"><Plus size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {membersWithTasks.map(member => (
              <div 
                key={member.id} 
                className={`swimlane-row glass ${hoveredMemberId === String(member.id) ? 'drop-active' : ''}`}
                onMouseEnter={() => setHoveredMemberId(String(member.id))}
                onMouseLeave={() => setHoveredMemberId(null)}
              >
                <div className="swimlane-header">
                  <div className="member-info">
                    <div className="avatar-circle">
                      {member.avatar ? <img src={member.avatar} alt={member.name} /> : member.name[0]}
                    </div>
                    <div className="member-details">
                      <span className="name">{member.name}</span>
                      <span className="role">{member.role}</span>
                    </div>

                    {/* 멤버별 상태 집계 */}
                    <div className="member-status-counts">
                      {member.statusCounts['In Progress'] > 0 && (
                        <span className="status-count-chip in-progress" title="진행 중">
                          <span className="dot" /> 진행 {member.statusCounts['In Progress']}
                        </span>
                      )}
                      {member.statusCounts['To Do'] > 0 && (
                        <span className="status-count-chip todo" title="대기">
                          <span className="dot" /> 대기 {member.statusCounts['To Do']}
                        </span>
                      )}
                      {member.statusCounts['Review'] > 0 && (
                        <span className="status-count-chip review" title="검수 중">
                          <span className="dot" /> 검수 {member.statusCounts['Review']}
                        </span>
                      )}
                      {member.statusCounts['Done'] > 0 && (
                        <span className="status-count-chip done" title="완료">
                          <span className="dot" /> 완료 {member.statusCounts['Done']}
                        </span>
                      )}
                      {member.overdueCount > 0 && (
                        <span className="status-count-chip overdue" title="기한 초과">
                          <Flame size={10} /> 지연 {member.overdueCount}
                        </span>
                      )}
                    </div>

                    {/* Individual Progress Bar in Swimlane Header */}
                    <div className="member-swimlane-progress-box">
                      <div className="swimlane-progress-meta">
                        <span className="label">Personal Progress</span>
                        <span className="value">{member.memberProgress}%</span>
                      </div>
                      <div className="swimlane-progress-track">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${member.memberProgress}%` }}
                          className="swimlane-progress-fill"
                          style={{ 
                            background: member.memberProgress >= 100 ? 'var(--success-gradient)' : 'var(--primary-gradient)'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {(() => {
                  const projectGroups = {};
                  member.tasks.forEach(t => {
                    const pId = t.project_id || 'unassigned';
                    if (!projectGroups[pId]) {
                      projectGroups[pId] = {
                        project: t.project || { title: '프로젝트 없음' },
                        tasks: []
                      };
                    }
                    projectGroups[pId].tasks.push(t);
                  });

                  const groupArray = Object.values(projectGroups);

                  return groupArray.length > 0 ? groupArray.map((group, gIdx) => (
                    <div key={group.project.id || gIdx} className="project-group-container">
                      <div className="project-group-header">
                        <Hash size={14} /> {group.project.title}
                      </div>
                      <div className="kanban-grid row-grid">
                        {statuses.map(status => (
                          <div
                            key={status}
                            className={`kanban-column-compact ${isDragging && hoveredStatus === status ? 'drop-active-status' : ''}`}
                            onMouseEnter={() => isDragging && setHoveredStatus(status)}
                            onMouseLeave={() => setHoveredStatus(prev => prev === status ? null : prev)}
                          >
                            <div className="mobile-column-label">{statusLabels[status]}</div>
                            {group.tasks.filter(t => t.status === status).map(renderTaskCard)}
                            <button className="add-task-inline mini" onClick={() => openCreateModal(status)} title="작업 추가"><Plus size={14} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )) : (
                    <div className="kanban-grid row-grid">
                      {statuses.map(status => (
                        <div
                          key={status}
                          className={`kanban-column-compact ${isDragging && hoveredStatus === status ? 'drop-active-status' : ''}`}
                          onMouseEnter={() => isDragging && setHoveredStatus(status)}
                          onMouseLeave={() => setHoveredStatus(prev => prev === status ? null : prev)}
                        >
                          <button className="add-task-inline mini" onClick={() => openCreateModal(status)} title="작업 추가"><Plus size={14} /></button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            ))}
            
            {membersWithTasks.length === 0 && unassignedTasks.length === 0 && !loading && (
              <div className="empty-board glass">
                <p>영자가 새 작업을 기다리고 있어요! 🖌️</p>
                <button className="action-btn primary mt-4" onClick={() => openCreateModal()}>첫 작업 추가하기</button>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showTaskModal && (
          <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
            <motion.div 
              className="modal-content glass premium-modal form-modal"
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>{editingTask ? '작업 수정' : '새 작업 추가'}</h2>
                <button className="close-btn" onClick={() => setShowTaskModal(false)}><Plus size={20} style={{ transform: 'rotate(45deg)' }} /></button>
              </div>
              
              <div className="form-body custom-scrollbar">
                <div className="form-grid">
                  <div className="form-field full">
                    <label>작업 내용</label>
                    <div 
                      className="glass-input clickable-textarea-trigger"
                      onClick={() => setShowContentModal(true)}
                      style={{ 
                        minHeight: '100px', 
                        padding: '12px', 
                        cursor: 'pointer',
                        whiteSpace: 'pre-wrap',
                        overflow: 'hidden',
                        opacity: taskForm.content ? 1 : 0.6
                      }}
                    >
                      {taskForm.content || "여기를 클릭해서 작업 내용을 상세하게 작성하세요..."}
                    </div>
                  </div>
                  
                  <div className="form-field">
                    <label>프로젝트</label>
                    <select 
                      value={taskForm.project_id}
                      onChange={(e) => setTaskForm({...taskForm, project_id: e.target.value})}
                      className="glass-input"
                    >
                      <option value="">프로젝트 선택</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>

                  <div className="form-field full">
                    <label>담당자 배정 (여러 명 선택 가능)</label>
                    <div className="assignee-selector-grid glass-pannel">
                      {members.map(m => (
                        <div 
                          key={m.id} 
                          className={`assignee-chip-item ${taskForm.assignee_ids.includes(String(m.id)) ? 'selected' : ''}`}
                          onClick={() => {
                            const ids = [...taskForm.assignee_ids];
                            if (ids.includes(String(m.id))) {
                              setTaskForm({ ...taskForm, assignee_ids: ids.filter(id => id !== String(m.id)) });
                            } else {
                              setTaskForm({ ...taskForm, assignee_ids: [...ids, String(m.id)] });
                            }
                          }}
                        >
                          <div className="chip-avatar">
                            {m.avatar ? <img src={m.avatar} alt={m.name} /> : m.name[0]}
                          </div>
                          <span>{m.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="form-field">
                    <label>상태</label>
                    <select 
                      value={taskForm.status}
                      onChange={(e) => setTaskForm({...taskForm, status: e.target.value})}
                      className="glass-input"
                    >
                      {statuses.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
                    </select>
                  </div>

                  <div className="form-field">
                    <label>우선순위</label>
                    <select 
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({...taskForm, priority: e.target.value})}
                      className="glass-input"
                    >
                      <option value="High">높음</option>
                      <option value="Medium">중간</option>
                      <option value="Low">낮음</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label>마감일</label>
                    <input 
                      type="date"
                      value={taskForm.due_date}
                      onChange={(e) => setTaskForm({...taskForm, due_date: e.target.value})}
                      className="glass-input dark-calendar"
                    />
                  </div>

                  <div className="form-field full">
                    <div className="flex justify-between items-center mb-2">
                      <label>진도율 설정</label>
                      <div className="progress-value-badge">
                        <input 
                          type="number" 
                          min="0" 
                          max="100" 
                          value={taskForm.progress}
                          onChange={(e) => {
                            const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                            setTaskForm({...taskForm, progress: val});
                          }}
                          className="progress-number-input"
                        />
                        <span className="unit">%</span>
                      </div>
                    </div>
                    <div className="progress-slider-container">
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="5"
                        value={taskForm.progress}
                        onChange={(e) => setTaskForm({...taskForm, progress: parseInt(e.target.value)})}
                        className="glass-range-slider"
                      />
                      <div className="slider-labels">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  className="action-btn primary" 
                  onClick={handleSaveTask}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '저장 중...' : (editingTask ? '변경사항 저장' : <><Plus size={18} /> 작업 추가</>)}
                </button>
                <button className="action-btn outline" onClick={() => setShowTaskModal(false)}>취소</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteModal && (
          <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
            <motion.div 
              className="modal-content glass premium-modal confirm-modal"
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-icon warning">
                <AlertTriangle size={48} />
              </div>
              <h3>작업 삭제</h3>
              <p>진정으로 이 작업을 삭제하시겠어요?<br/>삭제된 데이터는 복구할 수 없어요.</p>
              
              <div className="modal-footer mt-6">
                <button 
                  className="action-btn danger" 
                  onClick={handleDeleteTask}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '삭제 중...' : '네, 삭제할게요'}
                </button>
                <button className="action-btn outline" onClick={() => setShowDeleteModal(false)}>아니오</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showContentModal && (
          <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={() => setShowContentModal(false)}>
            <motion.div 
              className="modal-content glass premium-modal"
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: '90%', maxWidth: '800px', height: '80vh', display: 'flex', flexDirection: 'column' }}
            >
              <div className="modal-header">
                <h2>작업 내용 (상세 편집)</h2>
                <button className="close-btn" onClick={() => setShowContentModal(false)}><Plus size={20} style={{ transform: 'rotate(45deg)' }} /></button>
              </div>
              
              <div className="form-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: '20px' }}>
                <textarea 
                  placeholder="작업 내용을 자세히 입력해주세요."
                  value={taskForm.content}
                  onChange={(e) => setTaskForm({...taskForm, content: e.target.value})}
                  className="glass-input custom-scrollbar"
                  style={{ flex: 1, resize: 'none', padding: '16px', fontSize: '15px' }}
                  autoFocus
                />
              </div>
              
              <div className="modal-footer" style={{ marginTop: '20px' }}>
                <button 
                  className="action-btn primary" 
                  onClick={() => setShowContentModal(false)}
                >
                  <CheckCircle size={18} /> 내용 확정
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default TaskBoard;
