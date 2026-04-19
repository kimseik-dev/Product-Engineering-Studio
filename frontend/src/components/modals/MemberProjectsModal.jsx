import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Calendar, Rocket, CheckSquare, X } from 'lucide-react';
import { statusMap } from '../../lib/constants';

const MemberProjectsModal = ({ member, onClose, onGoToTasks }) => (
  <AnimatePresence>
    {member && (
      <div className="modal-overlay" onClick={onClose}>
        <motion.div
          className="modal-content glass premium-modal member-projects-modal"
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <div className="member-profile-summary">
              <div className="member-avatar-giant">
                {member.avatar ? <img src={member.avatar} alt={member.name} /> : member.name[0]}
                <span className={`status-dot-large ${member.status.toLowerCase()}`}></span>
              </div>
              <div className="member-name-role">
                <h2>{member.name} 대표님</h2>
                <p>{member.role}</p>
              </div>
            </div>
            <button className="close-btn" onClick={onClose}><X size={20} /></button>
          </div>

          <div className="modal-body custom-scrollbar">
            <div className="member-projects-section">
              <h3 className="section-subtitle"><Briefcase size={16} /> 현재 참여 중인 프로젝트</h3>
              <div className="member-project-list">
                {member.projects.length > 0 ? (
                  member.projects.map((project, idx) => (
                    <motion.div
                      key={project.id}
                      className={`member-project-item glass-card status-${project.status.toLowerCase()}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <div className="proj-info">
                        <span className="proj-group">{project.group_name}</span>
                        <h4 className="proj-title">{project.title}</h4>
                      </div>
                      <div className="proj-meta">
                        <div className="proj-date">
                          <Calendar size={14} />
                          <span>{project.end_date ? new Date(project.end_date).toLocaleDateString() : '일정 미정'}</span>
                        </div>
                        <div className={`badge badge-${project.status.toLowerCase()} small`}>
                          {statusMap[project.status]}
                        </div>
                      </div>
                      <div className="proj-progress-mini">
                        <div className="progress-bar-bg mini">
                          <div
                            className={`progress-bar-fill fill-${project.status.toLowerCase()}`}
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <span className="progress-percentText">{project.progress}%</span>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="empty-projects">
                    <Rocket size={40} className="empty-icon" />
                    <p>현재 참여 중인 프로젝트가 없습니다.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button className="action-btn primary" onClick={() => onGoToTasks(member.id)}>
              <CheckSquare size={18} /> 담당 작업 확인하기
            </button>
            <button className="action-btn outline" onClick={onClose}>닫기</button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export default MemberProjectsModal;
