import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hash, Plus } from 'lucide-react';

const CategoryModal = ({ show, editing, form, setForm, isSubmitting, onSave, onClose }) => (
  <AnimatePresence>
    {show && (
      <div className="modal-overlay" onClick={onClose}>
        <motion.div
          className="modal-content glass premium-modal category-modal"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '450px' }}
        >
          <div className="modal-header">
            <div className="title-with-icon">
              <Hash size={20} className="text-indigo-400" />
              <h2>{editing ? '카테고리 수정' : '새 카테고리 추가'}</h2>
            </div>
            <button className="close-btn" onClick={onClose}>
              <Plus size={20} style={{ transform: 'rotate(45deg)' }} />
            </button>
          </div>

          <div className="modal-body">
            <div className="form-group mb-4">
              <label>식별 키 (영문/숫자)</label>
              <input
                type="text"
                className="glass-input"
                placeholder="예: notice, tip, QnA"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={!!editing}
              />
              <p className="input-hint">시스템 내부 식별용이며 수정이 불가능해요.</p>
            </div>
            <div className="form-group mb-4">
              <label>카테고리 명 (표시용)</label>
              <input
                type="text"
                className="glass-input"
                placeholder="예: 공지사항, 팁/노하우"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>
            <div className="form-group mb-4">
              <label>포인트 컬러</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  style={{ width: '50px', height: '40px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  className="glass-input"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button className="action-btn outline" onClick={onClose}>취소</button>
            <button
              className="action-btn primary"
              onClick={onSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? '저장 중...' : (editing ? '수정 완료 👍' : '등록하기 🚀')}
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export default CategoryModal;
