import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
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
  AlertTriangle
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

const TaskBoard = ({ members = [], projects = [], initialMemberId = 'All', onProjectUpdate }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(initialMemberId);
  const [viewMode, setViewMode] = useState('swimlane'); // 'board' or 'swimlane'
  
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
    assignee_id: ''
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
      .select('*, assignee:members(*), project:projects(*)')
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

  const openCreateModal = (initialStatus = 'To Do') => {
    setEditingTask(null);
    setTaskForm({
      content: '',
      status: initialStatus,
      priority: 'Medium',
      due_date: '',
      project_id: projects[0]?.id || '',
      assignee_id: ''
    });
    setShowTaskModal(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setTaskForm({
      content: task.content,
      status: task.status,
      priority: task.priority,
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      project_id: task.project_id,
      assignee_id: task.assignee_id || ''
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
      const payload = {
        ...taskForm,
        assignee_id: taskForm.assignee_id || null,
        due_date: taskForm.due_date || null
      };

      if (editingTask) {
        const { error } = await supabase
          .from('tasks')
          .update(payload)
          .eq('id', editingTask.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert([payload]);
        if (error) throw error;
      }

      // Automatically add assignee to project members if not already added
      if (taskForm.assignee_id && taskForm.project_id) {
        // Check if relationship already exists
        const { data: existingRelation, error: checkError } = await supabase
          .from('_ProjectMembers')
          .select('*')
          .eq('A', taskForm.assignee_id)
          .eq('B', taskForm.project_id)
          .maybeSingle();
        
        if (!checkError && !existingRelation) {
          // Add to _ProjectMembers table (A: memberId, B: projectId)
          const { error: insertRelError } = await supabase
            .from('_ProjectMembers')
            .insert([{ A: taskForm.assignee_id, B: taskForm.project_id }]);
          
          if (insertRelError) {
            console.error('Failed to auto-add member to project:', insertRelError);
          } else {
            console.log(`Auto-added member ${taskForm.assignee_id} to project ${taskForm.project_id}`);
          }
        } else if (checkError) {
          console.error('Error checking project member relationship:', checkError);
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
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskToDelete.id);
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

  const filteredTasks = selectedMember === 'All' 
    ? tasks 
    : tasks.filter(t => String(t.assignee_id) === String(selectedMember));

  // Group tasks by assignee for swimlane view
  const membersWithTasks = members.map(m => ({
    ...m,
    tasks: filteredTasks.filter(t => String(t.assignee_id) === String(m.id))
  })).filter(m => selectedMember === 'All' || String(m.id) === String(selectedMember));

  // Tasks with no assignee
  const unassignedTasks = filteredTasks.filter(t => !t.assignee_id);

  const renderTaskCard = (task) => (
    <motion.div
      key={task.id}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="task-card glass card-glow group"
      onClick={() => openEditModal(task)}
    >
      <div className="task-card-header">
        <span className={`priority-tag ${task.priority.toLowerCase()}`}>
          {priorityIcons[task.priority]} {task.priority}
        </span>
        <div className="card-actions-overlay opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
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
            <span className="filter-label"><Filter size={16} /> 필터:</span>
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
                  <AnimatePresence>
                    {filteredTasks.filter(t => t.status === status).map(renderTaskCard)}
                  </AnimatePresence>
                  <button className="add-task-inline" onClick={() => openCreateModal(status)}><Plus size={16} /> 작업 추가</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="swimlane-container">
            {/* Unassigned Tasks if any */}
            {unassignedTasks.length > 0 && (
              <div className="swimlane-row">
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
              <div key={member.id} className="swimlane-row">
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
                
                {/* Grouping by Project */}
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

      {/* Task Creation/Edit Modal */}
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

                  <div className="form-field">
                    <label>담당자</label>
                    <select 
                      value={taskForm.assignee_id}
                      onChange={(e) => setTaskForm({...taskForm, assignee_id: e.target.value})}
                      className="glass-input"
                    >
                      <option value="">담당자 없음</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
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

      {/* Delete Confirmation Modal */}
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
