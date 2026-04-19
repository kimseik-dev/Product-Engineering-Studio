import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hash, Users, Layers, Circle, AlertCircle, Clock, Search, Calendar, Plus, X } from 'lucide-react';

const PHASES = [
  { key: 'planning', label: '📋 기획', color: '#a78bfa' },
  { key: 'design', label: '🎨 디자인', color: '#f472b6' },
  { key: 'development', label: '⚙️ 개발', color: '#60a5fa' },
  { key: 'test', label: '🧪 테스트', color: '#4ade80' },
];

const ProjectFormModal = ({ show, editing, form, setForm, isSubmitting, onSave, onClose }) => (
  <AnimatePresence>
    {show && (
      <div className="modal-overlay" onClick={onClose}>
        <motion.div
          className="modal-content glass premium-modal form-modal"
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2>{editing ? '프로젝트 수정' : '새 프로젝트 추가'}</h2>
            <button className="close-btn" onClick={onClose}><X size={20} /></button>
          </div>

          <div className="form-body custom-scrollbar">
            <div className="form-grid">
              <div className="form-field full">
                <label><Hash size={14} /> 프로젝트 명</label>
                <input
                  type="text"
                  placeholder="예: AI 비서 영자 고도화"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="glass-input"
                />
              </div>
              <div className="form-field">
                <label><Users size={14} /> 그룹명</label>
                <input
                  type="text"
                  placeholder="예: Connect AI LAB"
                  value={form.group_name}
                  onChange={(e) => setForm({ ...form, group_name: e.target.value })}
                  className="glass-input"
                />
              </div>
              <div className="form-field">
                <label><Layers size={14} /> 개발 영역</label>
                <input
                  type="text"
                  placeholder="예: Frontend, Mobile"
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  className="glass-input"
                />
              </div>
              <div className="form-field full">
                <label><Circle size={14} /> 현재 작업 내용</label>
                <textarea
                  placeholder="무슨 작업을 하고 있나요?"
                  value={form.task}
                  onChange={(e) => setForm({ ...form, task: e.target.value })}
                  className="glass-input"
                />
              </div>
              <div className="form-field">
                <label><AlertCircle size={14} /> 현재 상태</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="glass-input select-premium"
                >
                  <option value="Pending">🛡️ 대기</option>
                  <option value="Planning">📋 기획</option>
                  <option value="Design">🎨 디자인</option>
                  <option value="Development">⚙️ 개발</option>
                  <option value="Review">🔍 검수</option>
                  <option value="Launch">🏁 출시</option>
                </select>
              </div>
              <div className="form-field">
                <label><Clock size={14} /> 프로젝트 진행률</label>
                <div className="slider-wrapper">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={form.progress}
                    onChange={(e) => setForm({ ...form, progress: parseInt(e.target.value) })}
                    className="glass-slider"
                  />
                  <span className="slider-value">{form.progress}%</span>
                </div>
              </div>
              <div className="form-field">
                <label><Search size={14} /> 검수 예정일</label>
                <input
                  type="date"
                  value={form.inspection_date}
                  onChange={(e) => setForm({ ...form, inspection_date: e.target.value })}
                  className="glass-input"
                />
              </div>
              <div className="form-field">
                <label><Calendar size={14} /> 프로젝트 종료일</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="glass-input"
                />
              </div>
            </div>

            <div className="phase-schedule-section">
              <div className="phase-schedule-title">
                <Calendar size={16} /> 단계별 일정
                <span className="phase-schedule-hint">각 단계의 시작/마감일을 설정하세요 (선택)</span>
              </div>
              <div className="phase-schedule-grid">
                {PHASES.map(phase => (
                  <div key={phase.key} className="phase-row" style={{ borderLeft: `3px solid ${phase.color}` }}>
                    <div className="phase-row-label">{phase.label}</div>
                    <div className="phase-row-dates">
                      <input
                        type="date"
                        value={form[`${phase.key}_start`] || ''}
                        onChange={(e) => setForm({ ...form, [`${phase.key}_start`]: e.target.value })}
                        className="glass-input dark-calendar"
                      />
                      <span className="phase-row-sep">~</span>
                      <input
                        type="date"
                        value={form[`${phase.key}_end`] || ''}
                        onChange={(e) => setForm({ ...form, [`${phase.key}_end`]: e.target.value })}
                        className="glass-input dark-calendar"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              className="action-btn primary"
              onClick={onSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? '저장 중...' : (editing ? '변경사항 저장' : <><Plus size={18} /> 프로젝트 생성</>)}
            </button>
            <button className="action-btn outline" onClick={onClose}>취소</button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export default ProjectFormModal;
