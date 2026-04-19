import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Plus, CheckCircle } from 'lucide-react';

const AssigneeSelectModal = ({ show, task, members, selectedIds, setSelectedIds, isSubmitting, onSave, onClose }) => (
  <AnimatePresence>
    {show && task && (
      <div className="modal-overlay" onClick={onClose}>
        <motion.div
          className="modal-content glass premium-modal quick-assign-modal"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <div className="title-with-icon">
              <UserPlus size={20} className="text-indigo-400" />
              <div className="header-text">
                <h2>담당자 배정</h2>
                <p className="task-ref">#{task.content.substring(0, 15)}...</p>
              </div>
            </div>
            <button className="close-btn" onClick={onClose}>
              <Plus size={20} style={{ transform: 'rotate(45deg)' }} />
            </button>
          </div>

          <div className="modal-body custom-scrollbar">
            <p className="modal-subtitle">이 작업에 함께할 팀원들을 선택해 주세요! 🧑‍🤝‍🧑</p>
            <div className="assignee-selector-grid glass-pannel mt-4">
              {members.map(m => (
                <div
                  key={m.id}
                  className={`assignee-chip-item ${selectedIds.includes(String(m.id)) ? 'selected' : ''}`}
                  onClick={() => {
                    const ids = [...selectedIds];
                    if (ids.includes(String(m.id))) {
                      setSelectedIds(ids.filter(id => id !== String(m.id)));
                    } else {
                      setSelectedIds([...ids, String(m.id)]);
                    }
                  }}
                >
                  <div className="chip-avatar">
                    {m.avatar ? <img src={m.avatar} alt={m.name} /> : m.name[0]}
                  </div>
                  <div className="chip-info">
                    <span className="name">{m.name}</span>
                    <span className="role">{m.role}</span>
                  </div>
                  {selectedIds.includes(String(m.id)) && <CheckCircle size={14} className="check-icon" />}
                </div>
              ))}
            </div>
          </div>

          <div className="modal-footer">
            <button className="action-btn outline" onClick={onClose}>취소</button>
            <button
              className="action-btn primary"
              onClick={onSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? '저장 중...' : '배정 완료 ✨'}
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export default AssigneeSelectModal;
