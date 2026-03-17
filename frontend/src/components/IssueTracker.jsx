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
  AlertTriangle,
  Send,
  X,
  MessageSquare
} from 'lucide-react';

const statuses = ['Issue', 'In Progress', 'Resolved'];
const statusLabels = {
  'Issue': '⚠️ 이슈 발생',
  'In Progress': '⚙️ 처리 중',
  'Resolved': '✅ 해결 완료'
};
const statusColors = {
  'Issue': 'rgba(239, 68, 68, 0.8)', // Red
  'In Progress': 'rgba(59, 130, 246, 0.8)', // Blue
  'Resolved': 'rgba(16, 185, 129, 0.8)' // Green
};

const priorityLabels = {
  'Critical': '🚨 치명적',
  'Warning': '⚠️ 경고',
  'Normal': '💬 일반'
};

const priorityStyles = {
  'Critical': { color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' },
  'Warning': { color: '#fbbf24', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.2)' },
  'Normal': { color: '#a1a1aa', background: 'rgba(161, 161, 170, 0.1)', border: '1px solid rgba(161, 161, 170, 0.2)' }
};

const IssueTracker = ({ members = [], projects = [], onUpdate }) => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [selectedProject, setSelectedProject] = useState('All');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    content: '',
    status: 'Issue',
    priority: 'Normal',
    project_id: projects[0]?.id || '',
    assignee_id: ''
  });

  useEffect(() => {
    fetchIssues();
  }, [selectedProject]);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('issues')
        .select('*, project:projects(id, title), assignee:members(id, name, avatar)')
        .order('created_at', { ascending: false });

      if (selectedProject !== 'All') {
        query = query.eq('project_id', selectedProject);
      }

      const { data, error } = await query;
      if (error) throw error;
      setIssues(data || []);
    } catch (error) {
      console.error('Error fetching issues:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingIssue(null);
    setForm({
      title: '',
      content: '',
      status: 'Issue',
      priority: 'Normal',
      project_id: projects[0]?.id || '',
      assignee_id: ''
    });
    setShowModal(true);
  };

  const openEditModal = (issue) => {
    setEditingIssue(issue);
    setForm({
      title: issue.title,
      content: issue.content,
      status: issue.status,
      priority: issue.priority,
      project_id: issue.project_id,
      assignee_id: issue.assignee_id || ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.project_id) {
      alert('이슈 제목과 프로젝트는 필수입니다! 대표님! 📢');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        title: form.title,
        content: form.content,
        status: form.status,
        priority: form.priority,
        project_id: form.project_id,
        assignee_id: form.assignee_id || null
      };

      if (editingIssue) {
        const { error } = await supabase
          .from('issues')
          .update(payload)
          .eq('id', editingIssue.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('issues')
          .insert([payload]);
        if (error) throw error;
      }

      setShowModal(false);
      fetchIssues();
      if (onUpdate) onUpdate();
    } catch (error) {
      alert(`이슈 저장 중 오류: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('이 이슈를 삭제하시겠어요?')) return;
    try {
      const { error } = await supabase.from('issues').delete().eq('id', id);
      if (error) throw error;
      fetchIssues();
      if (onUpdate) onUpdate();
    } catch (error) {
      alert(`삭제 오류: ${error.message}`);
    }
  };

  return (
    <div className="issue-tracker-container">
      <div className="board-header glass">
        <div className="board-header-left">
          <h2>🚨 PES 이슈 프리미엄 센터</h2>
          <select 
            className="glass-input compact" 
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="All">전체 프로젝트 이슈</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
        <button className="action-btn primary" onClick={openCreateModal}>
          <Plus size={18} /> 새 이슈 등록
        </button>
      </div>

      <div className="issue-kanban-grid">
        {statuses.map(status => (
          <div key={status} className="kanban-column glass">
            <div className="column-header">
              <h3 style={{ borderBottomColor: statusColors[status] }}>
                {statusLabels[status]}
              </h3>
              <span className="task-count">
                {issues.filter(i => i.status === status).length}
              </span>
            </div>
            
            <div className="column-tasks issue-list custom-scrollbar">
              <AnimatePresence>
                {issues.filter(i => i.status === status).map((issue, idx) => (
                  <motion.div
                    key={issue.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`issue-card glass ${issue.priority.toLowerCase()}`}
                    onClick={() => openEditModal(issue)}
                  >
                    <div className="issue-card-priority" style={priorityStyles[issue.priority]}>
                      {priorityLabels[issue.priority]}
                    </div>
                    <h4 className="issue-title">{issue.title}</h4>
                    <p className="issue-desc">{issue.content}</p>
                    
                    <div className="issue-footer">
                      <div className="issue-project">
                        <Hash size={12} /> {issue.project?.title}
                      </div>
                      {issue.assignee && (
                        <div className="issue-assignee">
                          {issue.assignee.avatar ? (
                            <img src={issue.assignee.avatar} alt={issue.assignee.name} title={issue.assignee.name} />
                          ) : (
                            <span title={issue.assignee.name}>{issue.assignee.name[0]}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      {/* Issue Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <motion.div 
              className="modal-content glass premium-modal form-modal"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>{editingIssue ? '이슈 수정' : '새 이슈 등록'}</h2>
                <button className="close-btn" onClick={() => setShowModal(false)}><X size={20} /></button>
              </div>

              <div className="form-body">
                <div className="form-grid">
                  <div className="form-field full">
                    <label>이슈 제목</label>
                    <input 
                      type="text" 
                      value={form.title}
                      onChange={(e) => setForm({...form, title: e.target.value})}
                      className="glass-input"
                      placeholder="무슨 문제가 발생했나요?"
                    />
                  </div>
                  <div className="form-field full">
                    <label>상세 내용</label>
                    <textarea 
                      value={form.content}
                      onChange={(e) => setForm({...form, content: e.target.value})}
                      className="glass-input"
                      placeholder="원인과 진행 상황을 적어주세요."
                    />
                  </div>
                  <div className="form-field">
                    <label>긴급도</label>
                    <select 
                      value={form.priority}
                      onChange={(e) => setForm({...form, priority: e.target.value})}
                      className="glass-input"
                    >
                      <option value="Normal">💬 일반</option>
                      <option value="Warning">⚠️ 경고</option>
                      <option value="Critical">🚨 치명적</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>상태</label>
                    <select 
                      value={form.status}
                      onChange={(e) => setForm({...form, status: e.target.value})}
                      className="glass-input"
                    >
                      {statuses.map(s => (
                        <option key={s} value={s}>{statusLabels[s]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>관련 프로젝트</label>
                    <select 
                      value={form.project_id}
                      onChange={(e) => setForm({...form, project_id: e.target.value})}
                      className="glass-input"
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>담당자</label>
                    <select 
                      value={form.assignee_id}
                      onChange={(e) => setForm({...form, assignee_id: e.target.value})}
                      className="glass-input"
                    >
                      <option value="">담당자 선택 안함</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                {editingIssue && (
                  <button className="action-btn danger outline" onClick={() => handleDelete(editingIssue.id)}>
                    삭제
                  </button>
                )}
                <div style={{ flex: 1 }}></div>
                <button className="action-btn outline" onClick={() => setShowModal(false)}>취소</button>
                <button className="action-btn primary" onClick={handleSave} disabled={isSubmitting}>
                  {isSubmitting ? '저장 중...' : '저장하기'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default IssueTracker;
