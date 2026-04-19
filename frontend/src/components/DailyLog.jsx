import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Save, User, Database, Calendar, Tag, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';

const CURRENT_USER_KEY = 'dailylog.currentUserId';

const toISODate = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatKR = (isoDate) => {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
};

const DailyLog = ({ members = [], projects = [] }) => {
  const [selectedDate, setSelectedDate] = useState(() => toISODate(new Date()));
  const [currentUserId, setCurrentUserId] = useState(() => localStorage.getItem(CURRENT_USER_KEY) || '');
  const [logs, setLogs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const [drafts, setDrafts] = useState({}); // { memberId: { today, tomorrow, projectIds: [], taskIds: [] } }
  const [savingId, setSavingId] = useState(null);
  const [tagOpenFor, setTagOpenFor] = useState(null);
  const tagPanelRef = useRef(null);

  useEffect(() => {
    if (currentUserId) {
      localStorage.setItem(CURRENT_USER_KEY, currentUserId);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchLogs();
    const channel = supabase.channel(`daily_logs_sync_${selectedDate}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_logs' }, () => fetchLogs())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedDate]);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, assignees:task_assignees(member_id)')
        .eq('is_completed', false);
      if (error) throw error;
      setTasks(data || []);
    } catch (e) {
      console.warn('Failed to fetch tasks for tagging:', e.message);
    }
  };

  useEffect(() => {
    const onClick = (e) => {
      if (tagPanelRef.current && !tagPanelRef.current.contains(e.target)) {
        setTagOpenFor(null);
      }
    };
    if (tagOpenFor) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [tagOpenFor]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('log_date', selectedDate);

      if (error) {
        if (error.code === '42P01') {
          setDbError(true);
          setLogs([]);
          return;
        }
        throw error;
      }
      setDbError(false);
      setLogs(data || []);

      const draftMap = {};
      (data || []).forEach(log => {
        draftMap[String(log.member_id)] = {
          today: log.today_content || '',
          tomorrow: log.tomorrow_content || '',
          projectIds: (log.tagged_project_ids || []).map(String),
          taskIds: (log.tagged_task_ids || []).map(String),
        };
      });
      setDrafts(draftMap);
    } catch (e) {
      console.error('Failed to fetch daily_logs:', e.message);
      toast.error(`불러오기 오류: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getDraft = (memberId) => {
    const key = String(memberId);
    return drafts[key] || { today: '', tomorrow: '', projectIds: [], taskIds: [] };
  };

  const updateDraft = (memberId, patch) => {
    const key = String(memberId);
    setDrafts(prev => ({
      ...prev,
      [key]: { ...getDraft(memberId), ...patch }
    }));
  };

  const saveLog = async (memberId) => {
    const key = String(memberId);
    const draft = getDraft(memberId);
    setSavingId(key);
    try {
      const payload = {
        member_id: memberId,
        log_date: selectedDate,
        today_content: draft.today,
        tomorrow_content: draft.tomorrow,
        tagged_project_ids: draft.projectIds.map(id => Number(id)),
        tagged_task_ids: draft.taskIds.map(id => Number(id)),
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('daily_logs')
        .upsert(payload, { onConflict: 'member_id,log_date' });
      if (error) throw error;
      toast.success('저장 완료!');
      fetchLogs();
    } catch (e) {
      toast.error(`저장 오류: ${e.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const shiftDate = (days) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    setSelectedDate(toISODate(d));
  };

  const isToday = toISODate(new Date()) === selectedDate;
  const todayISO = toISODate(new Date());
  const tomorrowISO = toISODate(new Date(Date.now() + 86400000));
  const dateLabel = selectedDate === todayISO ? '오늘'
    : selectedDate === tomorrowISO ? '내일'
    : selectedDate === toISODate(new Date(Date.now() - 86400000)) ? '어제'
    : null;

  const currentUser = members.find(m => String(m.id) === String(currentUserId));

  const sortedMembers = useMemo(() => {
    if (!currentUser) return members;
    return [currentUser, ...members.filter(m => String(m.id) !== String(currentUserId))];
  }, [members, currentUserId, currentUser]);

  const writtenCount = useMemo(() => {
    return logs.filter(l => (l.today_content || '').trim() || (l.tomorrow_content || '').trim()).length;
  }, [logs]);

  const dateDisplay = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    return {
      month: d.getMonth() + 1,
      day: d.getDate(),
      weekday: d.toLocaleDateString('ko-KR', { weekday: 'long' }),
      year: d.getFullYear(),
    };
  }, [selectedDate]);

  if (dbError) {
    return (
      <div className="glass" style={{ padding: 60, textAlign: 'center', borderRadius: 24, marginTop: 24 }}>
        <Database size={56} style={{ opacity: 0.6, marginBottom: 20, color: '#818cf8' }} />
        <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>daily_logs 테이블이 없어요</h3>
        <p style={{ opacity: 0.6, marginBottom: 20 }}>
          프로젝트 루트의 <b>daily_logs_setup.sql</b> 을 Supabase SQL 에디터에 실행해주세요.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className="daily-log-view"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* 헤더 */}
      <div
        className="glass"
        style={{
          padding: '22px 28px',
          borderRadius: 22,
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: 20,
        }}
      >
        {/* Left: 제목 + 진행률 */}
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            📝 일일 업무
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 999,
              background: writtenCount === members.length && members.length > 0 ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${writtenCount === members.length && members.length > 0 ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.08)'}`,
              fontSize: 12, fontWeight: 600,
              color: writtenCount === members.length && members.length > 0 ? '#86efac' : 'rgba(255,255,255,0.7)',
            }}>
              <Check size={12} />
              {writtenCount} / {members.length} 작성
            </div>
            {members.length > 0 && (
              <div style={{
                flex: 1, maxWidth: 120, height: 4,
                background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden',
              }}>
                <div style={{
                  width: `${(writtenCount / members.length) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                  transition: 'width 0.3s',
                }} />
              </div>
            )}
          </div>
        </div>

        {/* Center: 날짜 네비게이터 (hero) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <motion.button
            whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.08)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => shiftDate(-1)}
            title="어제"
            style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.8)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ChevronLeft size={20} />
          </motion.button>

          <button
            onClick={() => setSelectedDate(toISODate(new Date()))}
            disabled={isToday}
            style={{
              minWidth: 160,
              padding: '10px 20px',
              background: dateLabel ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${dateLabel ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 14,
              cursor: isToday ? 'default' : 'pointer',
              textAlign: 'center',
              color: 'white',
            }}
            title={isToday ? '오늘 보는 중' : '오늘로 이동'}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>
                {dateDisplay.month}월 {dateDisplay.day}일
              </span>
              <span style={{ fontSize: 13, opacity: 0.5 }}>({dateDisplay.weekday[0]})</span>
            </div>
            <div style={{
              fontSize: 11, fontWeight: 600,
              color: dateLabel === '오늘' ? '#4ade80' : dateLabel === '내일' ? '#60a5fa' : 'rgba(255,255,255,0.4)',
              marginTop: 2,
              letterSpacing: '0.5px',
            }}>
              {dateLabel || dateDisplay.year}
            </div>
          </button>

          <motion.button
            whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.08)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => shiftDate(1)}
            title="내일"
            style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.8)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ChevronRight size={20} />
          </motion.button>
        </div>

        {/* Right: 본인 선택 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <label
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 14px 8px 10px',
              background: currentUser ? 'rgba(99,102,241,0.1)' : 'rgba(251,191,36,0.08)',
              border: `1px solid ${currentUser ? 'rgba(99,102,241,0.3)' : 'rgba(251,191,36,0.3)'}`,
              borderRadius: 14, cursor: 'pointer',
              minWidth: 180,
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', flexShrink: 0,
            }}>
              {currentUser?.avatar
                ? <img src={currentUser.avatar} alt={currentUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <User size={16} style={{ color: currentUser ? '#a5b4fc' : '#fbbf24' }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, opacity: 0.55, fontWeight: 600, letterSpacing: '0.3px', marginBottom: 1 }}>
                나는
              </div>
              <select
                value={currentUserId}
                onChange={(e) => setCurrentUserId(e.target.value)}
                style={{
                  background: 'transparent', border: 'none',
                  color: 'white', fontSize: 14, fontWeight: 600,
                  outline: 'none', cursor: 'pointer', width: '100%',
                  padding: 0,
                }}
              >
                <option value="" style={{ background: '#1a1a2e' }}>선택하세요</option>
                {members.map(m => (
                  <option key={m.id} value={m.id} style={{ background: '#1a1a2e' }}>{m.name}</option>
                ))}
              </select>
            </div>
          </label>
        </div>
      </div>

      {!currentUserId && (
        <div className="glass" style={{ padding: 18, borderRadius: 14, marginTop: 16, borderLeft: '3px solid #fbbf24', fontSize: 14 }}>
          👤 <b>본인을 선택</b>하면 해당 멤버의 업무를 편집할 수 있어요. 다른 사람 것은 읽기 전용으로 보입니다.
        </div>
      )}

      {loading && logs.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', opacity: 0.5 }}>불러오는 중...</div>
      ) : members.length === 0 ? (
        <div className="glass" style={{ padding: 60, textAlign: 'center', borderRadius: 24, marginTop: 24, opacity: 0.6 }}>
          등록된 멤버가 없습니다.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
          {sortedMembers.map((member, idx) => {
            const isMe = String(member.id) === String(currentUserId);
            const draft = getDraft(member.id);
            const selectedProjects = projects.filter(p => draft.projectIds.includes(String(p.id)));
            const selectedTasks = tasks.filter(t => draft.taskIds.includes(String(t.id)));

            return (
              <motion.div
                key={member.id}
                className="glass"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                style={{
                  padding: 20,
                  borderRadius: 20,
                  borderLeft: isMe ? '4px solid #6366f1' : '4px solid transparent',
                  background: isMe ? 'rgba(99,102,241,0.05)' : undefined,
                }}
              >
                {/* 멤버 헤더 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, overflow: 'hidden'
                  }}>
                    {member.avatar
                      ? <img src={member.avatar} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : member.name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>
                      {member.name}
                      {isMe && <span style={{ fontSize: 11, marginLeft: 8, padding: '2px 8px', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', borderRadius: 999 }}>나</span>}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.5 }}>{member.role}</div>
                  </div>
                  {isMe && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      className="action-btn primary"
                      onClick={() => saveLog(member.id)}
                      disabled={savingId === String(member.id)}
                      style={{ padding: '8px 16px', fontSize: 13 }}
                    >
                      <Save size={14} />
                      {savingId === String(member.id) ? '저장 중...' : '저장'}
                    </motion.button>
                  )}
                </div>

                {/* 금일/다음날 필드 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <LogField
                    label="📌 금일 작업"
                    value={draft.today}
                    editable={isMe}
                    onChange={(v) => updateDraft(member.id, { today: v })}
                  />
                  <LogField
                    label="🔜 다음날 작업"
                    value={draft.tomorrow}
                    editable={isMe}
                    onChange={(v) => updateDraft(member.id, { tomorrow: v })}
                  />
                </div>

                {/* 태그 */}
                <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  {selectedProjects.map(p => (
                    <span key={`p-${p.id}`} className="tag-chip" style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
                      📁 {p.title}
                      {isMe && (
                        <button className="tag-chip-x" onClick={() => updateDraft(member.id, { projectIds: draft.projectIds.filter(id => id !== String(p.id)) })}>×</button>
                      )}
                    </span>
                  ))}
                  {selectedTasks.map(t => (
                    <span key={`t-${t.id}`} className="tag-chip" style={{ background: 'rgba(52,211,153,0.12)', color: '#6ee7b7', border: '1px solid rgba(52,211,153,0.3)' }}>
                      ✓ {t.content?.slice(0, 24)}{t.content?.length > 24 ? '…' : ''}
                      {isMe && (
                        <button className="tag-chip-x" onClick={() => updateDraft(member.id, { taskIds: draft.taskIds.filter(id => id !== String(t.id)) })}>×</button>
                      )}
                    </span>
                  ))}
                  {isMe && (
                    <div style={{ position: 'relative' }}>
                      <button
                        className="tag-chip"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.2)', cursor: 'pointer' }}
                        onClick={() => setTagOpenFor(tagOpenFor === String(member.id) ? null : String(member.id))}
                      >
                        <Tag size={12} /> 태그 추가
                      </button>
                      <AnimatePresence>
                        {tagOpenFor === String(member.id) && (
                          <motion.div
                            ref={tagPanelRef}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="glass"
                            style={{
                              position: 'absolute', top: '110%', left: 0, zIndex: 20,
                              width: 320, maxHeight: 340, overflowY: 'auto',
                              padding: 10, borderRadius: 14,
                              border: '1px solid rgba(255,255,255,0.1)',
                              background: 'rgba(20,20,35,0.98)',
                            }}
                          >
                            <TagPicker
                              projects={projects}
                              tasks={tasks}
                              memberId={member.id}
                              selectedProjectIds={draft.projectIds}
                              selectedTaskIds={draft.taskIds}
                              onToggleProject={(id) => {
                                const sid = String(id);
                                const exists = draft.projectIds.includes(sid);
                                updateDraft(member.id, {
                                  projectIds: exists ? draft.projectIds.filter(x => x !== sid) : [...draft.projectIds, sid]
                                });
                              }}
                              onToggleTask={(id) => {
                                const sid = String(id);
                                const exists = draft.taskIds.includes(sid);
                                updateDraft(member.id, {
                                  taskIds: exists ? draft.taskIds.filter(x => x !== sid) : [...draft.taskIds, sid]
                                });
                              }}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

const LogField = ({ label, value, editable, onChange }) => (
  <div>
    <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.6, marginBottom: 6 }}>{label}</div>
    {editable ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="무엇을 하셨나요?"
        style={{
          width: '100%', minHeight: 90, padding: 12,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10, color: 'white', fontSize: 14,
          fontFamily: 'inherit', resize: 'vertical', outline: 'none',
        }}
      />
    ) : (
      <div style={{
        minHeight: 90, padding: 12, borderRadius: 10,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        fontSize: 14, whiteSpace: 'pre-wrap',
        color: value ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)',
      }}>
        {value || '아직 작성되지 않았습니다.'}
      </div>
    )}
  </div>
);

const TagPicker = ({ projects, tasks, memberId, selectedProjectIds, selectedTaskIds, onToggleProject, onToggleTask }) => {
  // 이 멤버의 참여 프로젝트를 먼저 보여줌
  const myProjects = projects.filter(p => (p.members || []).some(m => String(m.id) === String(memberId)));
  const otherProjects = projects.filter(p => !myProjects.includes(p));
  const myTasks = tasks.filter(t => (t.assignees || []).some(a => String(a.member_id || a.id) === String(memberId)));

  const Section = ({ title, items, renderLabel, selectedIds, onToggle }) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, opacity: 0.5, padding: '6px 8px', fontWeight: 600 }}>{title}</div>
      {items.length === 0 ? (
        <div style={{ fontSize: 12, opacity: 0.3, padding: '4px 8px' }}>없음</div>
      ) : items.map(item => {
        const checked = selectedIds.includes(String(item.id));
        return (
          <div
            key={item.id}
            onClick={() => onToggle(item.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 8px', borderRadius: 8, cursor: 'pointer',
              background: checked ? 'rgba(99,102,241,0.12)' : 'transparent',
              fontSize: 13,
            }}
          >
            <div style={{
              width: 14, height: 14, borderRadius: 4,
              border: '1.5px solid rgba(255,255,255,0.3)',
              background: checked ? '#6366f1' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {checked && <Check size={10} color="white" strokeWidth={3} />}
            </div>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {renderLabel(item)}
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div>
      <Section
        title="📁 내 프로젝트"
        items={myProjects}
        renderLabel={(p) => p.title}
        selectedIds={selectedProjectIds}
        onToggle={onToggleProject}
      />
      {otherProjects.length > 0 && (
        <Section
          title="📁 기타 프로젝트"
          items={otherProjects}
          renderLabel={(p) => p.title}
          selectedIds={selectedProjectIds}
          onToggle={onToggleProject}
        />
      )}
      <Section
        title="✓ 내 작업"
        items={myTasks}
        renderLabel={(t) => t.content}
        selectedIds={selectedTaskIds}
        onToggle={onToggleTask}
      />
    </div>
  );
};

export default DailyLog;
