import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ExternalLink, Check, Circle, FileText, Edit3, Loader2, Link as LinkIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';

const PHASE_META = {
  planning:    { label: '기획', emoji: '📋', color: '#a78bfa' },
  design:      { label: '디자인', emoji: '🎨', color: '#f472b6' },
  development: { label: '개발', emoji: '⚙️', color: '#60a5fa' },
  test:        { label: '테스트', emoji: '🧪', color: '#4ade80' },
};

const STATUS_META = {
  not_started: { label: '미시작', color: 'rgba(255,255,255,0.45)', bg: 'rgba(255,255,255,0.04)' },
  draft:       { label: '초안', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  reviewing:   { label: '검수중', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  done:        { label: '완료', color: '#4ade80', bg: 'rgba(74,222,128,0.14)' },
};

const STATUS_ORDER = ['not_started', 'draft', 'reviewing', 'done'];

const DEFAULT_TEMPLATE = [
  { phase: 'planning',    type: 'meeting_notes', title: '회의록', sort_order: 0 },
  { phase: 'planning',    type: 'ia',            title: 'IA',      sort_order: 1 },
  { phase: 'planning',    type: 'swimlane',      title: 'Swimlane',sort_order: 2 },
  { phase: 'design',      type: 'ux_proto',      title: 'UX 프로토타입', sort_order: 0 },
  { phase: 'design',      type: 'ui_design',     title: 'UI 디자인',     sort_order: 1 },
  { phase: 'development', type: 'screen_spec',   title: '화면설계서',    sort_order: 0 },
  { phase: 'development', type: 'api_spec',      title: 'API 스펙',      sort_order: 1 },
  { phase: 'test',        type: 'qa_checklist',  title: 'QA 체크리스트', sort_order: 0 },
];

const ProjectArtifactsChecklist = ({ projectId }) => {
  const [artifacts, setArtifacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ title: '', url: '', note: '' });
  const [addingPhase, setAddingPhase] = useState(null);
  const [newItemTitle, setNewItemTitle] = useState('');

  useEffect(() => {
    if (!projectId) return;
    fetchArtifacts();
    const ch = supabase.channel(`project_artifacts_${projectId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'project_artifacts',
        filter: `project_id=eq.${projectId}`,
      }, () => fetchArtifacts())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [projectId]);

  const fetchArtifacts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_artifacts')
        .select('*')
        .eq('project_id', projectId)
        .order('phase', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error) {
        if (error.code === '42P01') { setDbError(true); setArtifacts([]); return; }
        throw error;
      }

      // 0개면 템플릿 자동 생성
      if ((data || []).length === 0) {
        await seedTemplate();
        return; // seed 후 channel이 다시 fetch 트리거
      }

      setDbError(false);
      setArtifacts(data);
    } catch (e) {
      toast.error(`산출물 로드 오류: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const seedTemplate = async () => {
    try {
      const rows = DEFAULT_TEMPLATE.map(t => ({ ...t, project_id: projectId }));
      const { error } = await supabase.from('project_artifacts').insert(rows);
      if (error) throw error;
    } catch (e) {
      console.error('템플릿 생성 실패:', e.message);
    }
  };

  const grouped = useMemo(() => {
    const map = { planning: [], design: [], development: [], test: [] };
    artifacts.forEach(a => {
      if (!map[a.phase]) map[a.phase] = [];
      map[a.phase].push(a);
    });
    return map;
  }, [artifacts]);

  const stats = useMemo(() => {
    const total = artifacts.length;
    const done = artifacts.filter(a => a.status === 'done').length;
    return { total, done };
  }, [artifacts]);

  const startEdit = (artifact) => {
    setEditingId(artifact.id);
    setDraft({ title: artifact.title, url: artifact.url || '', note: artifact.note || '' });
  };

  const saveEdit = async (id) => {
    try {
      const { error } = await supabase
        .from('project_artifacts')
        .update({ ...draft, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setEditingId(null);
    } catch (e) {
      toast.error(`저장 오류: ${e.message}`);
    }
  };

  const cycleStatus = async (artifact) => {
    const curIdx = STATUS_ORDER.indexOf(artifact.status);
    const next = STATUS_ORDER[(curIdx + 1) % STATUS_ORDER.length];
    setArtifacts(prev => prev.map(a => a.id === artifact.id ? { ...a, status: next } : a));
    await supabase.from('project_artifacts').update({ status: next }).eq('id', artifact.id);
  };

  const deleteArtifact = async (id) => {
    if (!window.confirm('이 산출물 항목을 삭제할까요?')) return;
    await supabase.from('project_artifacts').delete().eq('id', id);
  };

  const addCustomItem = async (phase) => {
    const title = newItemTitle.trim();
    if (!title) return;
    const maxSort = Math.max(-1, ...grouped[phase].map(a => a.sort_order || 0));
    await supabase.from('project_artifacts').insert([{
      project_id: projectId, phase, type: 'custom', title, sort_order: maxSort + 1,
    }]);
    setAddingPhase(null);
    setNewItemTitle('');
  };

  if (dbError) {
    return (
      <div className="glass" style={{ padding: 20, borderRadius: 12, opacity: 0.7, fontSize: 13 }}>
        <b>project_artifacts 테이블이 없어요.</b>
        <div style={{ marginTop: 6, opacity: 0.7 }}>
          프로젝트 루트의 <code>project_artifacts_setup.sql</code>을 실행해주세요.
        </div>
      </div>
    );
  }

  return (
    <div className="artifacts-checklist">
      <div className="artifacts-summary">
        <FileText size={14} />
        <span>산출물 체크리스트</span>
        <span className="artifacts-progress-chip">
          {stats.done} / {stats.total}
        </span>
        {stats.total > 0 && (
          <div className="artifacts-progress-track">
            <div
              className="artifacts-progress-fill"
              style={{ width: `${(stats.done / stats.total) * 100}%` }}
            />
          </div>
        )}
      </div>

      {loading && artifacts.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', opacity: 0.5, fontSize: 12 }}>
          <Loader2 size={14} className="spin" /> 불러오는 중...
        </div>
      ) : (
        <div className="artifacts-phases">
          {Object.entries(PHASE_META).map(([phaseKey, meta]) => {
            const items = grouped[phaseKey] || [];
            return (
              <div key={phaseKey} className="artifact-phase" style={{ borderLeftColor: meta.color }}>
                <div className="artifact-phase-header">
                  <span style={{ color: meta.color }}>
                    {meta.emoji} {meta.label}
                  </span>
                  <span className="artifact-phase-count">
                    {items.filter(a => a.status === 'done').length}/{items.length}
                  </span>
                </div>

                <div className="artifact-items">
                  <AnimatePresence>
                    {items.map(a => {
                      const isEditing = editingId === a.id;
                      const statusMeta = STATUS_META[a.status] || STATUS_META.not_started;
                      return (
                        <motion.div
                          key={a.id}
                          layout
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="artifact-item"
                        >
                          {/* 상태 체크박스 */}
                          <button
                            className="artifact-status-btn"
                            onClick={() => cycleStatus(a)}
                            style={{ background: statusMeta.bg, color: statusMeta.color }}
                            title={`상태: ${statusMeta.label} (클릭 시 다음 상태)`}
                          >
                            {a.status === 'done' ? <Check size={13} strokeWidth={3} /> : <Circle size={13} />}
                          </button>

                          {/* 본문 */}
                          {isEditing ? (
                            <div className="artifact-edit-form">
                              <input
                                value={draft.title}
                                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                                placeholder="제목"
                                className="artifact-input"
                                autoFocus
                              />
                              <input
                                value={draft.url}
                                onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                                placeholder="https://... (Notion/Figma/드라이브 링크)"
                                className="artifact-input"
                              />
                              <input
                                value={draft.note}
                                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                                placeholder="메모 (선택)"
                                className="artifact-input"
                              />
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="action-btn primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => saveEdit(a.id)}>저장</button>
                                <button className="action-btn outline" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setEditingId(null)}>취소</button>
                              </div>
                            </div>
                          ) : (
                            <div className="artifact-body">
                              <div className="artifact-title-row">
                                <span className="artifact-title">{a.title}</span>
                                <span className="artifact-status-chip" style={{ background: statusMeta.bg, color: statusMeta.color }}>
                                  {statusMeta.label}
                                </span>
                              </div>
                              {a.url && (
                                <a href={a.url} target="_blank" rel="noopener noreferrer" className="artifact-url" onClick={(e) => e.stopPropagation()}>
                                  <LinkIcon size={10} /> {a.url.replace(/^https?:\/\//, '').slice(0, 40)}{a.url.length > 40 ? '…' : ''}
                                </a>
                              )}
                              {a.note && (
                                <div className="artifact-note">{a.note}</div>
                              )}
                            </div>
                          )}

                          {/* 액션 */}
                          {!isEditing && (
                            <div className="artifact-actions">
                              {a.url && (
                                <a href={a.url} target="_blank" rel="noopener noreferrer" className="icon-btn xs" title="열기">
                                  <ExternalLink size={12} />
                                </a>
                              )}
                              <button className="icon-btn xs" onClick={() => startEdit(a)} title="편집">
                                <Edit3 size={12} />
                              </button>
                              <button className="icon-btn xs delete" onClick={() => deleteArtifact(a.id)} title="삭제">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {/* 커스텀 추가 */}
                  {addingPhase === phaseKey ? (
                    <div className="artifact-add-row">
                      <input
                        autoFocus
                        value={newItemTitle}
                        onChange={(e) => setNewItemTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') addCustomItem(phaseKey); if (e.key === 'Escape') { setAddingPhase(null); setNewItemTitle(''); } }}
                        placeholder="산출물 제목 (Enter = 추가)"
                        className="artifact-input"
                      />
                      <button className="action-btn primary" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => addCustomItem(phaseKey)}>추가</button>
                      <button className="action-btn outline" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => { setAddingPhase(null); setNewItemTitle(''); }}>취소</button>
                    </div>
                  ) : (
                    <button className="artifact-add-btn" onClick={() => setAddingPhase(phaseKey)}>
                      <Plus size={12} /> 항목 추가
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProjectArtifactsChecklist;
