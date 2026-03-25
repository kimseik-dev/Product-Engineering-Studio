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
  UserPlus
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

const TaskBoard = ({ members = [], projects = [], initialMemberId = 'All', onProjectUpdate, onQuickAssign }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(initialMemberId);
  const [selectedProject, setSelectedProject] = useState('All');
  const [viewMode, setViewMode] = useState('swimlane'); // 'board' or 'swimlane'
  const [hoveredMemberId, setHoveredMemberId] = useState(null); // For Drag & Drop
  const [isDragging, setIsDragging] = useState(false);
  
  // Update local selector if prop changes
  useEffect(() => {
    setSelectedMember(initialMemberId);
  }, [initialMemberId]);

  // Task CRUD State
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskForm, setTaskForm] = useState({
    content: '',
    status: 'To Do',
    priority: 'Medium',
    due_date: '',
    project_id: '',
    assignee_ids: []
  });

  // Delete Confirmation State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  useEffect(() => {
    fetchTasks();
    
    const taskChannel = supabase.channel('task_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchTasks())
      .subscribe();

    return () => {
      supabase.removeChannel(taskChannel);
    };
  }, []);

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
    
    if (hoveredMemberId) {
      const newAssigneeIds = hoveredMemberId === 'Unassigned' ? [] : [parseInt(hoveredMemberId)];
      
      setTasks(prev => prev.map(t => 
        t.id === task.id ? { ...t, assignee_ids: newAssigneeIds } : t
      ));

      try {
        await supabase.from('_TaskAssignees').delete().eq('B', task.id);
        if (newAssigneeIds.length > 0) {
          await supabase.from('_TaskAssignees').insert(newAssigneeIds.map(id => ({ A: id, B: task.id })));
        }
        toast.success(newAssigneeIds.length > 0 ? '배정 완료! ✨' : '배정 해제! 얍!');
        fetchTasks();
      } catch (error) {
        toast.error('배정 중 오류가 발생했어요. 😢');
        fetchTasks();
      }
    }
  };

  const openCreateModal = (initialStatus = 'To Do') => {
    setEditingTask(null);
    setTaskForm({
      content: '',
      status: initialStatus,
      priority: 'Medium',
      due_date: '',
      project_id: projects[0]?.id || '',
      assignee_ids: []
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
      assignee_ids: task.assignees ? task.assignees.map(m => String(m.id)) : []
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
        await supabase.from('_TaskAssignees').delete().eq('B', taskId);
        if (taskForm.assignee_ids.length > 0) {
          const relations = taskForm.assignee_ids.map(mId => ({ A: mId, B: taskId }));
          const { error } = await supabase.from('_TaskAssignees').insert(relations);
          if (error) throw error;
        }
      }

      if (taskForm.assignee_ids.length > 0 && taskForm.project_id) {
        for (const mId of taskForm.assignee_ids) {
          const { data: existingRelation } = await supabase.from('_ProjectMembers').select('*').eq('A', mId).eq('B', taskForm.project_id).maybeSingle();
          if (!existingRelation) await supabase.from('_ProjectMembers').insert([{ A: mId, B: taskForm.project_id }]);
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

  const filteredTasks = tasks.filter(t => {
    const memberMatch = selectedMember === 'All' || (Array.isArray(t.assignees) && t.assignees.some(m => String(m.id) === String(selectedMember)));
    const projectMatch = selectedProject === 'All' || String(t.project_id) === String(selectedProject);
    return memberMatch && projectMatch;
  });

  const membersWithTasks = members.map(m => ({
    ...m,
    tasks: tasks.filter(t => {
      const assignedToMe = Array.isArray(t.assignees) && t.assignees.some(assignee => String(assignee.id) === String(m.id));
      const projectMatch = selectedProject === 'All' || String(t.project_id) === String(selectedProject);
      return assignedToMe && projectMatch;
    })
  })).filter(m => selectedMember === 'All' || String(m.id) === String(selectedMember));

  const unassignedTasks = tasks.filter(t => {
    const noAssignee = !Array.isArray(t.assignees) || t.assignees.length === 0;
    const projectMatch = selectedProject === 'All' || String(t.project_id) === String(selectedProject);
    return noAssignee && projectMatch;
  });

  const renderTaskCard = (task) => (
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
      className="task-card glass card-glow group"
      onClick={() => !isDragging && openEditModal(task)}
    >
      <div className="task-card-header">
        <span className={`priority-tag ${task.priority.toLowerCase()}`}>
          {priorityIcons[task.priority]} {task.priority}
        </span>
        <div className="card-actions-overlay opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          {(!Array.isArray(task.assignees) || task.assignees.length === 0) && (
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
      <div className="task-card-footer">
        <div className="task-project">
          <Hash size={12} /> {task.project?.title || 'Unknown Project'}
        </div>
        <div className="task-assignees-avatars">
          {Array.isArray(task.assignees) && task.assignees.length > 0 ? (
            task.assignees.map(m => (
              <div key={m.id} className="mini-avatar" title={m.name}>
                {m.avatar ? <img src={m.avatar} alt={m.name} /> : m.name[0]}
              </div>
            ))
          ) : (
            <div className="no-assignee-v2" title="담당자 없음">
              <User size={12} className="opacity-40" />
            </div>
          )}
        </div>
        {task.due_date && (
          <div className="task-due text-xs opacity-70">
            <Clock size={12} /> {new Date(task.due_date).toLocaleDateString()}
          </div>
        )}
      </div>
    </motion.div>
  );

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
            {statuses.map(status => (
              <div key={status} className="kanban-column glass">
                <div className="column-header">
                  <h3 style={{ color: statusColors[status].includes('var') ? statusColors[status] : undefined }}>
                    {statusLabels[status]}
                  </h3>
                  <span className="task-count">
                    {filteredTasks.filter(t => t.status === status).length}
                  </span>
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
            ))}
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
                    <div key={status} className="kanban-column-compact">
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
                          <div key={status} className="kanban-column-compact">
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
                        <div key={status} className="kanban-column-compact">
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
                    <textarea 
                      placeholder="무슨 일을 해야 하나요?"
                      value={taskForm.content}
                      onChange={(e) => setTaskForm({...taskForm, content: e.target.value})}
                      className="glass-input"
                    />
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

    </div>
  );
};

export default TaskBoard;
