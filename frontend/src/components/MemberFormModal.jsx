import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Check } from 'lucide-react';
import { AVATAR_LIST } from '../lib/constants';

const STATUS_OPTIONS = [
  { val: 'Away', label: '대기' },
  { val: 'Active', label: '진행' },
  { val: 'Offline', label: '완료' },
];

const MemberFormModal = ({ show, editing, form, setForm, isSubmitting, onSave, onClose }) => (
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
            <h2>{editing ? '멤버 정보 수정' : '새 팀 멤버 초대'}</h2>
            <button className="close-btn" onClick={onClose}><X size={20} /></button>
          </div>

          <div className="form-body custom-scrollbar">
            <div className="form-grid">
              <div className="form-field">
                <label>이름</label>
                <input
                  type="text"
                  placeholder="예: 김영자"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="glass-input"
                />
              </div>
              <div className="form-field">
                <label>역할</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
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
                        className={`avatar-picker-item ${form.avatar === av.path ? 'active' : ''}`}
                        onClick={() => setForm({ ...form, avatar: av.path })}
                        title={av.category}
                      >
                        <img src={av.path} alt={av.id} />
                        {form.avatar === av.path && (
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
                  value={form.avatar}
                  onChange={(e) => setForm({ ...form, avatar: e.target.value })}
                  className="glass-input"
                />
              </div>
              <div className="form-field full">
                <label>상태</label>
                <div className="status-radio-group">
                  {STATUS_OPTIONS.map(st => (
                    <label key={st.val} className={`status-radio ${form.status === st.val ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="member-status"
                        value={st.val}
                        checked={form.status === st.val}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
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
              onClick={onSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? '처리 중...' : (editing ? '수정 완료' : <><Plus size={18} /> 멤버 초대하기</>)}
            </button>
            <button className="action-btn outline" onClick={onClose}>취소</button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export default MemberFormModal;
