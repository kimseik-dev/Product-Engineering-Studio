import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Users, Layers, Calendar, Settings, Trash2, X } from 'lucide-react';
import PhaseTimeline from './PhaseTimeline';
import { statusMap } from '../lib/constants';

const ProjectDetailModal = ({ project, onClose, onEdit, onDelete, onMemberClick }) => (
  <AnimatePresence>
    {project && (
      <div className="modal-overlay" onClick={onClose}>
        <motion.div
          className={`modal-content glass premium-modal status-${project.status.toLowerCase()}`}
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-glow-orb"></div>

          <div className="modal-header">
            <div className="modal-header-info">
              <motion.div
                className="hero-icon-small"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
              >
                <Rocket size={18} />
              </motion.div>
              <h2 className="modal-title">{project.title}</h2>
              <div className={`badge badge-${project.status.toLowerCase()} modal-badge`}>
                <span className="pulse-dot"></span>
                {statusMap[project.status]}
              </div>
              {project.end_date && (
                <div className="modal-date-info">
                  <Calendar size={14} />
                  <span>종료일: {new Date(project.end_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            <div className="modal-header-actions">
              <button className="icon-btn small" title="수정" onClick={(e) => { onEdit(e, project); onClose(); }}><Settings size={14} /></button>
              <button className="icon-btn small delete" title="삭제" onClick={(e) => onDelete(e, project.id)}><Trash2 size={14} /></button>
              <button className="close-btn" onClick={onClose}><X size={20} /></button>
            </div>
          </div>

          <div className="modal-body custom-scrollbar">
            <motion.div
              className="detail-item task-section"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3><Rocket size={16} /> 현재 작업</h3>
              <p>{project.task || '진행 중인 작업 내용이 없습니다.'}</p>
            </motion.div>

            <div className="detail-item members-section">
              <h3><Users size={16} /> 참여 프로젝트 멤버</h3>
              <div className="modal-member-list">
                {project.members && project.members.length > 0 ? (
                  project.members.map((member, index) => (
                    <motion.div
                      key={member.id}
                      className="modal-member-item cursor-pointer"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + (index * 0.05) }}
                      onClick={() => onMemberClick(member.id)}
                    >
                      <div className="member-avatar-large">
                        {member.avatar ? <img src={member.avatar} alt={member.name} /> : member.name[0]}
                        <span className={`status-dot ${member.status.toLowerCase()}`}></span>
                      </div>
                      <div className="member-info">
                        <div className="member-name">{member.name}</div>
                        <div className="member-role">{member.role}</div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <p className="empty-text">배정된 팀원이 없습니다.</p>
                )}
              </div>
            </div>

            <motion.div
              className="detail-item progress-section"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3><Layers size={16} /> 개발 영역 및 진행률</h3>
              <div className="modal-progress-section">
                <div className="modal-progress-meta">
                  <span className="area-text">{project.area}</span>
                  <span className="progress-value">{project.progress}%</span>
                </div>
                <div className="progress-bar-bg larger">
                  <motion.div
                    className={`progress-bar-fill fill-${project.status.toLowerCase()}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${project.progress}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                  ></motion.div>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="detail-item"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h3><Calendar size={16} /> 단계별 일정</h3>
              <PhaseTimeline project={project} />
            </motion.div>
          </div>

          <div className="modal-footer">
            <button className="action-btn primary" onClick={(e) => { onClose(); onEdit(e, project); }}>업데이트</button>
            <button className="action-btn outline" onClick={onClose}>닫기</button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export default ProjectDetailModal;
