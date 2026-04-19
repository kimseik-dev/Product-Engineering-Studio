import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Clock,
  User,
  Hash,
  Filter,
  Trash2,
  AlertTriangle,
  X,
  Search,
  Flame,
  CheckCircle2,
  AlertOctagon,
  Activity,
  Send,
  MessageSquare
} from 'lucide-react';

const CURRENT_USER_KEY = 'dailylog.currentUserId'; // DailyLog와 공유

const statuses = ['Issue', 'In Progress', 'Resolved'];
const statusLabels = {
  'Issue': '⚠️ 이슈 발생',
  'In Progress': '⚙️ 처리 중',
  'Resolved': '✅ 해결 완료'
};
const statusColors = {
  'Issue': 'rgba(239, 68, 68, 0.8)',
  'In Progress': 'rgba(59, 130, 246, 0.8)',
  'Resolved': 'rgba(16, 185, 129, 0.8)'
};

const priorityLabels = {
  'Critical': '🚨 치명적',
  'Warning': '⚠️ 경고',
  'Normal': '💬 일반'
};

const priorityStyles = {
  'Critical': { color: '#ef4444', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)' },
  'Warning': { color: '#fbbf24', background: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.3)' },
  'Normal': { color: '#a1a1aa', background: 'rgba(161, 161, 170, 0.1)', border: '1px solid rgba(161, 161, 170, 0.2)' }
};

// 경과 시간 (상대 포맷)
const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}주 전`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월 전`;
  return `${Math.floor(days / 365)}년 전`;
};

// 미해결 이슈 오래된 정도 판단 (7일 이상 미해결 = stale)
const isStale = (issue) => {
  if (issue.status === 'Resolved') return false;
  if (!issue.created_at) return false;
  const days = (Date.now() - new Date(issue.created_at).getTime()) / 86400000;
  return days >= 7;
};

const IssueTracker = ({ members = [], projects = [], onUpdate }) => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [selectedProject, setSelectedProject] = useState('All');
  const [selectedAssignee, setSelectedAssignee] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredStatus, setHoveredStatus] = useState(null);

  // 코멘트 상태
  const [comments, setComments] = useState([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentAuthorId, setCommentAuthorId] = useState(() => localStorage.getItem(CURRENT_USER_KEY) || '');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [commentCounts, setCommentCounts] = useState({}); // issueId -> count

  useEffect(() => {
    if (commentAuthorId) localStorage.setItem(CURRENT_USER_KEY, commentAuthorId);
  }, [commentAuthorId]);

  // 코멘트 개수 일괄 로드 (카드에 뱃지 표시용)
  useEffect(() => {
    fetchCommentCounts();
    const ch = supabase.channel('issue_comments_count_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issue_comments' }, () => fetchCommentCounts())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchCommentCounts = async () => {
    try {
      const { data, error } = await supabase.from('issue_comments').select('issue_id');
      if (error) return;
      const counts = {};
      (data || []).forEach(c => {
        const k = String(c.issue_id);
        counts[k] = (counts[k] || 0) + 1;
      });
      setCommentCounts(counts);
    } catch {}
  };

  // 모달 열려 있을 때 해당 이슈의 코멘트 로드 + 실시간 동기화
  useEffect(() => {
    if (!editingIssue) return;
    fetchComments(editingIssue.id);
    const ch = supabase.channel(`issue_comments_${editingIssue.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'issue_comments',
        filter: `issue_id=eq.${editingIssue.id}`
      }, () => fetchComments(editingIssue.id))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [editingIssue]);

  const fetchComments = async (issueId) => {
    try {
      const { data, error } = await supabase
        .from('issue_comments')
        .select('*, author:members(id, name, avatar, role)')
        .eq('issue_id', issueId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setComments(data || []);
    } catch (e) {
      console.error('댓글 불러오기 실패:', e.message);
    }
  };

  const handleAddComment = async () => {
    if (!editingIssue || !commentDraft.trim()) return;
    setIsSendingComment(true);
    try {
      const payload = {
        issue_id: editingIssue.id,
        author_id: commentAuthorId ? Number(commentAuthorId) : null,
        content: commentDraft.trim(),
      };
      const { error } = await supabase.from('issue_comments').insert([payload]);
      if (error) throw error;
      setCommentDraft('');
      fetchComments(editingIssue.id);
    } catch (e) {
      toast.error(`댓글 등록 오류: ${e.message}`);
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleDeleteComment = async (id) => {
    if (!window.confirm('이 댓글을 삭제할까요?')) return;
    try {
      const { error } = await supabase.from('issue_comments').delete().eq('id', id);
      if (error) throw error;
      if (editingIssue) fetchComments(editingIssue.id);
    } catch (e) {
      toast.error(`삭제 오류: ${e.message}`);
    }
  };

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
    
    const issueChannel = supabase.channel('issue_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, () => fetchIssues())
      .subscribe();

    return () => {
      supabase.removeChannel(issueChannel);
    };
  }, [selectedProject]);

  // Sync issues when projects prop updates from App.jsx
  useEffect(() => {
    fetchIssues();
  }, [projects]);

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

  const handleDragEnd = async (issue) => {
    setIsDragging(false);
    const captured = hoveredStatus;
    setHoveredStatus(null);
    if (!captured || captured === issue.status) return;

    setIssues(prev => prev.map(i => i.id === issue.id ? { ...i, status: captured } : i));
    try {
      const { error } = await supabase.from('issues').update({ status: captured }).eq('id', issue.id);
      if (error) throw error;
      toast.success(`→ ${statusLabels[captured]}`);
      fetchIssues();
    } catch (e) {
      toast.error('상태 변경 오류');
      fetchIssues();
    }
  };

  const handleQuickPriority = async (issueId, newPriority) => {
    setIssues(prev => prev.map(i => i.id === issueId ? { ...i, priority: newPriority } : i));
    const { error } = await supabase.from('issues').update({ priority: newPriority }).eq('id', issueId);
    if (error) { toast.error('긴급도 변경 오류'); fetchIssues(); }
  };

  const handleQuickAssign = async (issueId, assigneeId) => {
    const value = assigneeId || null;
    setIssues(prev => prev.map(i => {
      if (i.id !== issueId) return i;
      const assignee = value ? members.find(m => String(m.id) === String(value)) : null;
      return { ...i, assignee_id: value, assignee: assignee || null };
    }));
    const { error } = await supabase.from('issues').update({ assignee_id: value }).eq('id', issueId);
    if (error) { toast.error('담당자 변경 오류'); fetchIssues(); }
  };

  // 필터 + 검색 + 정렬 통합
  const filteredIssues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = issues.filter(i => {
      const projectMatch = selectedProject === 'All' || String(i.project_id) === String(selectedProject);
      const assigneeMatch = selectedAssignee === 'All'
        || (selectedAssignee === 'None' && !i.assignee_id)
        || String(i.assignee_id) === String(selectedAssignee);
      const priorityMatch = selectedPriority === 'All' || i.priority === selectedPriority;
      const searchMatch = !q ||
        i.title?.toLowerCase().includes(q) ||
        i.content?.toLowerCase().includes(q) ||
        i.project?.title?.toLowerCase().includes(q) ||
        i.assignee?.name?.toLowerCase().includes(q);
      return projectMatch && assigneeMatch && priorityMatch && searchMatch;
    });

    if (sortBy === 'recent') list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (sortBy === 'oldest') list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    else if (sortBy === 'priority') {
      const order = { Critical: 0, Warning: 1, Normal: 2 };
      list.sort((a, b) => (order[a.priority] ?? 99) - (order[b.priority] ?? 99));
    }
    return list;
  }, [issues, selectedProject, selectedAssignee, selectedPriority, searchQuery, sortBy]);

  // 통계
  const stats = useMemo(() => {
    const open = issues.filter(i => i.status === 'Issue').length;
    const inProgress = issues.filter(i => i.status === 'In Progress').length;
    const resolved = issues.filter(i => i.status === 'Resolved').length;
    const critical = issues.filter(i => i.priority === 'Critical' && i.status !== 'Resolved').length;
    const stale = issues.filter(isStale).length;
    return { total: issues.length, open, inProgress, resolved, critical, stale };
  }, [issues]);

  const hasFilter = searchQuery || selectedProject !== 'All' || selectedAssignee !== 'All' || selectedPriority !== 'All';

  return (
    <div className="issue-tracker-container">
      {/* 상단 헤더 */}
      <div className="board-header glass" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="board-header-left">
          <h2>🚨 이슈 센터</h2>
          <p style={{ fontSize: 13, opacity: 0.55, margin: '4px 0 0' }}>
            발생한 문제를 빠르게 파악하고 해결하세요
          </p>
        </div>
        <button className="action-btn primary" onClick={openCreateModal}>
          <Plus size={18} /> 새 이슈 등록
        </button>
      </div>

      {/* 통계 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginTop: 16 }}>
        <IssueStat icon={<AlertOctagon size={18} />} label="미처리" value={stats.open} color="#ef4444" />
        <IssueStat icon={<Activity size={18} />} label="처리 중" value={stats.inProgress} color="#60a5fa" />
        <IssueStat icon={<CheckCircle2 size={18} />} label="해결 완료" value={stats.resolved} color="#4ade80" />
        <IssueStat icon={<Flame size={18} />} label="치명적 (미해결)" value={stats.critical} color="#fb7185" highlight={stats.critical > 0} />
        <IssueStat icon={<Clock size={18} />} label="7일+ 지연" value={stats.stale} color="#fbbf24" highlight={stats.stale > 0} />
      </div>

      {/* 필터 바 */}
      <div
        className="glass"
        style={{
          marginTop: 14, padding: 12, borderRadius: 14,
          display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
        }}
      >
        <div className="taskboard-search" style={{ flex: '1 1 240px', minWidth: 200 }}>
          <Search size={14} style={{ opacity: 0.6 }} />
          <input
            type="text"
            placeholder="이슈 · 내용 · 담당자 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="taskboard-search-clear" onClick={() => setSearchQuery('')}>
              <X size={12} />
            </button>
          )}
        </div>

        <div className="taskboard-sort">
          <span className="sort-label">프로젝트</span>
          <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="sort-select">
            <option value="All">전체</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>

        <div className="taskboard-sort">
          <span className="sort-label">담당자</span>
          <select value={selectedAssignee} onChange={(e) => setSelectedAssignee(e.target.value)} className="sort-select">
            <option value="All">전체</option>
            <option value="None">미배정</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        <div className="taskboard-sort">
          <span className="sort-label">긴급도</span>
          <select value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value)} className="sort-select">
            <option value="All">전체</option>
            <option value="Critical">🚨 치명적</option>
            <option value="Warning">⚠️ 경고</option>
            <option value="Normal">💬 일반</option>
          </select>
        </div>

        <div className="taskboard-sort">
          <span className="sort-label">정렬</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
            <option value="recent">🆕 최신순</option>
            <option value="oldest">🕰️ 오래된순</option>
            <option value="priority">🔥 긴급도순</option>
          </select>
        </div>

        {hasFilter && (
          <button
            className="action-btn outline"
            onClick={() => { setSearchQuery(''); setSelectedProject('All'); setSelectedAssignee('All'); setSelectedPriority('All'); }}
            style={{ padding: '7px 12px', fontSize: 12 }}
          >
            <X size={13} /> 초기화
          </button>
        )}
      </div>

      {/* 칸반 그리드 */}
      <div className="issue-kanban-grid" style={{ marginTop: 16 }}>
        {statuses.map(status => {
          const colIssues = filteredIssues.filter(i => i.status === status);
          return (
            <div
              key={status}
              className={`kanban-column glass ${isDragging && hoveredStatus === status ? 'drop-active-status' : ''}`}
              onMouseEnter={() => isDragging && setHoveredStatus(status)}
              onMouseLeave={() => setHoveredStatus(prev => prev === status ? null : prev)}
            >
              <div className="column-header">
                <h3 style={{ borderBottomColor: statusColors[status] }}>
                  {statusLabels[status]}
                </h3>
                <span className="task-count">{colIssues.length}</span>
              </div>

              <div className="column-tasks issue-list custom-scrollbar">
                <AnimatePresence>
                  {colIssues.map((issue) => {
                    const stale = isStale(issue);
                    return (
                      <motion.div
                        key={issue.id}
                        layout
                        drag
                        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                        dragElastic={0.1}
                        onDragStart={() => setIsDragging(true)}
                        onDragEnd={() => handleDragEnd(issue)}
                        whileDrag={{
                          scale: 1.04,
                          zIndex: 1000,
                          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                        }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`issue-card glass ${issue.priority.toLowerCase()} ${stale ? 'issue-stale' : ''} ${!issue.assignee_id ? 'issue-unassigned' : ''}`}
                        onClick={(e) => { if (!isDragging) openEditModal(issue); }}
                      >
                        <div className="issue-card-top">
                          {/* 긴급도 인라인 편집 */}
                          <select
                            className="issue-priority-select"
                            style={priorityStyles[issue.priority]}
                            value={issue.priority}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleQuickPriority(issue.id, e.target.value)}
                            title="긴급도 변경"
                          >
                            <option value="Critical">🚨 치명적</option>
                            <option value="Warning">⚠️ 경고</option>
                            <option value="Normal">💬 일반</option>
                          </select>

                          <div className="issue-card-actions">
                            {stale && (
                              <span className="issue-stale-badge" title="7일 이상 미해결">
                                <Clock size={10} /> {timeAgo(issue.created_at)}
                              </span>
                            )}
                            <button
                              className="icon-btn xs delete"
                              onClick={(e) => { e.stopPropagation(); handleDelete(issue.id); }}
                              title="삭제"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        <h4 className="issue-title">{issue.title}</h4>
                        {issue.content && <p className="issue-desc">{issue.content}</p>}

                        <div className="issue-footer">
                          <div className="issue-project">
                            <Hash size={12} /> {issue.project?.title}
                          </div>

                          <div className="issue-meta-right">
                            {commentCounts[String(issue.id)] > 0 && (
                              <span className="issue-comment-badge" title={`댓글 ${commentCounts[String(issue.id)]}개`}>
                                <MessageSquare size={10} /> {commentCounts[String(issue.id)]}
                              </span>
                            )}
                            {!stale && (
                              <span className="issue-time" title={new Date(issue.created_at).toLocaleString('ko-KR')}>
                                {timeAgo(issue.created_at)}
                              </span>
                            )}
                            {/* 담당자 인라인 편집 */}
                            <div className="issue-assignee-wrap" onClick={(e) => e.stopPropagation()}>
                              <select
                                className="issue-assignee-select"
                                value={issue.assignee_id || ''}
                                onChange={(e) => handleQuickAssign(issue.id, e.target.value)}
                                title="담당자 변경"
                              >
                                <option value="">미배정</option>
                                {members.map(m => (
                                  <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                              </select>
                              <div className="issue-assignee-display">
                                {issue.assignee ? (
                                  issue.assignee.avatar
                                    ? <img src={issue.assignee.avatar} alt={issue.assignee.name} />
                                    : <span>{issue.assignee.name[0]}</span>
                                ) : (
                                  <User size={12} style={{ opacity: 0.5 }} />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {colIssues.length === 0 && (
                  <div style={{ padding: 24, textAlign: 'center', opacity: 0.35, fontSize: 12 }}>
                    {status === 'Resolved' ? '아직 해결된 이슈가 없어요.' : '이슈가 없습니다.'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
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

                {/* 댓글 스레드 */}
                {editingIssue && (
                  <div className="issue-comments-section">
                    <div className="issue-comments-header">
                      <MessageSquare size={16} />
                      <span>댓글</span>
                      <span className="issue-comments-count">{comments.length}</span>
                    </div>

                    <div className="issue-comments-list custom-scrollbar">
                      {comments.length === 0 ? (
                        <div className="issue-comments-empty">
                          아직 댓글이 없습니다. 첫 의견을 남겨보세요 💬
                        </div>
                      ) : (
                        comments.map((c) => (
                          <div key={c.id} className="issue-comment">
                            <div className="issue-comment-avatar">
                              {c.author?.avatar
                                ? <img src={c.author.avatar} alt={c.author.name} />
                                : (c.author?.name?.[0] || '?')}
                            </div>
                            <div className="issue-comment-body">
                              <div className="issue-comment-meta">
                                <span className="issue-comment-author">
                                  {c.author?.name || '익명'}
                                </span>
                                {c.author?.role && (
                                  <span className="issue-comment-role">{c.author.role}</span>
                                )}
                                <span className="issue-comment-time" title={new Date(c.created_at).toLocaleString('ko-KR')}>
                                  {timeAgo(c.created_at)}
                                </span>
                                <button
                                  className="issue-comment-delete"
                                  onClick={() => handleDeleteComment(c.id)}
                                  title="댓글 삭제"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                              <div className="issue-comment-content">{c.content}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="issue-comment-composer">
                      <select
                        value={commentAuthorId}
                        onChange={(e) => setCommentAuthorId(e.target.value)}
                        className="issue-comment-author-select"
                        title="작성자 선택"
                      >
                        <option value="">익명</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      <textarea
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                            e.preventDefault();
                            handleAddComment();
                          }
                        }}
                        placeholder="댓글을 입력하세요... (⌘+Enter 전송)"
                        className="issue-comment-input"
                        rows={2}
                      />
                      <button
                        className="action-btn primary issue-comment-send"
                        onClick={handleAddComment}
                        disabled={isSendingComment || !commentDraft.trim()}
                      >
                        <Send size={14} />
                        {isSendingComment ? '전송 중...' : '전송'}
                      </button>
                    </div>
                  </div>
                )}
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

const IssueStat = ({ icon, label, value, color, highlight }) => (
  <motion.div
    className="glass"
    whileHover={{ y: -2 }}
    style={{
      padding: 14,
      borderRadius: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      borderLeft: `3px solid ${color}`,
      background: highlight ? `${color}0f` : undefined,
    }}
  >
    <div style={{
      width: 36, height: 36, borderRadius: 10,
      background: `${color}22`, color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {icon}
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, opacity: 0.55, fontWeight: 600, letterSpacing: '0.2px', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  </motion.div>
);

export default IssueTracker;
