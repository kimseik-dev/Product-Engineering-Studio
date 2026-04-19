import React from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Settings, Trash2 } from 'lucide-react';

const TeamView = ({ allMembers, projects, onMemberClick, onEdit, onDelete, onCreate }) => (
  <motion.div
    className="team-view"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <div className="list-header glass">
      <div className="list-title-area">
        <h2>🧑‍🤝‍🧑 팀 멤버 관리</h2>
        <p>현재 총 {allMembers.length}명의 전문가가 함께하고 있습니다.</p>
      </div>
      <button className="action-btn primary" onClick={onCreate}>
        <UserPlus size={18} /> 새 멤버 초대
      </button>
    </div>

    <div className="member-grid">
      {allMembers.map((member, idx) => (
        <motion.div
          key={member.id}
          className="member-card glass card-glow"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.05 }}
          onClick={() => onMemberClick(member.id)}
        >
          <div className="member-card-actions">
            <button className="icon-btn xs" onClick={(e) => { e.stopPropagation(); onEdit(member); }}><Settings size={14} /></button>
            <button className="icon-btn xs delete" onClick={(e) => { e.stopPropagation(); onDelete(member); }}><Trash2 size={14} /></button>
          </div>
          <div className="member-card-header">
            <div className="member-avatar-giant">
              {member.avatar ? <img src={member.avatar} alt={member.name} /> : member.name[0]}
              <span className={`status-dot-large ${member.status.toLowerCase()}`}></span>
            </div>
          </div>
          <div className="member-card-body">
            <h3 className="member-name">{member.name}</h3>
            <p className="member-role">{member.role}</p>
            <div className={`status-badge-compact st-${member.status.toLowerCase()}`}>
              {member.status}
            </div>
          </div>
          <div className="member-card-footer">
            <div className="member-stats">
              <div className="m-stat">
                <span className="m-label">참여 프로젝트</span>
                <span className="m-value">{projects.filter(p => p.members?.some(m => m.id === member.id)).length}개</span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

export default TeamView;
