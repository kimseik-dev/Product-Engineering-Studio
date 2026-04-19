import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

const DeleteMemberConfirmModal = ({ show, member, loading, onConfirm, onClose }) => (
  <AnimatePresence>
    {show && member && (
      <div className="modal-overlay danger-mood" onClick={onClose}>
        <motion.div
          className="modal-content glass premium-modal delete-confirm-modal"
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '420px', textAlign: 'center' }}
        >
          <div className="modal-decoration">
            <div className="glow-orb red"></div>
          </div>

          <div className="modal-header-centered">
            <div className="warning-icon-wrapper">
              <AlertTriangle size={36} className="text-red-500" />
            </div>
            <h2>팀원 삭제 확인</h2>
            <p className="modal-subtitle">정말 이 팀원과 작별하시겠습니까? 😢</p>
          </div>

          <div className="modal-body">
            <div className="target-member-preview">
              <div className="member-avatar-large">
                {member.avatar ? <img src={member.avatar} alt={member.name} /> : member.name[0]}
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{member.name}</h3>
              <p className="text-sm text-gray-400">{member.role}</p>
            </div>

            <div className="mt-6 px-8">
              <p className="text-xs text-red-400 opacity-70 leading-relaxed">
                ⚠️ 삭제 시 모든 배정된 업무에서도 제외되며,<br/>이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
          </div>

          <div className="modal-footer danger-footer">
            <button className="action-btn outline" onClick={onClose}>취소</button>
            <button
              className="action-btn primary danger-btn"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? '처리 중...' : '삭제하기'}
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export default DeleteMemberConfirmModal;
