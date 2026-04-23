import React from 'react';
import { motion } from 'framer-motion';
import {
  Eye, EyeOff, Users, AlertTriangle, Layers, Search,
  Calendar, Settings, Trash2, Rocket, CheckCircle, Paperclip
} from 'lucide-react';
import { statusMap } from '../lib/constants';

const DashboardView = ({
  stats, loading, errorStatus,
  showCompleted, onToggleCompleted,
  filter, onFilterChange,
  filteredProjects,
  onSelectProject, onEdit, onDelete,
  PhaseBadge,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
  >
    <div className="stats-row">
      {stats.map((stat, idx) => (
        <motion.div
          key={idx}
          className="stat-card glass"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
        >
          <span className="stat-label">{stat.label}</span>
          <span className="stat-value" style={{ background: stat.color, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {stat.value}
          </span>
        </motion.div>
      ))}
    </div>

    <section className="projects-section">
      <div className="section-header">
        <h2 className="section-title">전체 프로젝트 대시보드</h2>
        {loading && <span className="loading-spinner">데이터 불러오는 중...</span>}
        {errorStatus && <span className="error-message" style={{ color: '#ff4d4d', marginLeft: '10px' }}>구성 오류: {errorStatus}</span>}
        <div className="filters glass">
          <button
            className={`toggle-completed-btn-minimal ${!showCompleted ? 'off' : ''}`}
            onClick={onToggleCompleted}
            title={showCompleted ? "완료된 프로젝트 숨기기" : "완료된 프로젝트 보기"}
          >
            {showCompleted ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          <div className="filter-divider"></div>
          {Object.keys(statusMap).map((f) => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => onFilterChange(f)}
            >
              {statusMap[f]}
            </button>
          ))}
        </div>
      </div>

      <div className="project-sections-container">
        <div className="project-group-section">
          <div className="section-header">
            <h3 className="sub-section-title">🚀 현재 진행 프로젝트</h3>
          </div>
          <div className="project-grid">
            {filteredProjects.filter(p => p.status !== 'Launch').map((project, idx) => (
              <motion.div
                key={project.id}
                className={`project-card glass card-glow ${project.status.toLowerCase()}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => onSelectProject(project)}
              >
                <div className="card-header">
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="group-tag">{project.group_name}</span>
                    <PhaseBadge project={project} />
                  </div>
                  <div className="card-actions">
                    <button className="icon-btn xs" onClick={(e) => onEdit(e, project)}><Settings size={14} /></button>
                    <button className="icon-btn xs delete" onClick={(e) => onDelete(e, project.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="member-avatars">
                  {project.members && project.members.map((member, mIdx) => (
                    <div
                      key={member.id}
                      className="avatar-circle"
                      title={`${member.name} (${member.role})`}
                      style={{ zIndex: 10 - mIdx }}
                    >
                      {member.avatar ? <img src={member.avatar} alt={member.name} /> : member.name[0]}
                    </div>
                  ))}
                  {(!project.members || project.members.length === 0) && (
                    <div className="avatar-circle empty"><Users size={12} /></div>
                  )}
                </div>
                <h3 className="project-title">
                  {project.title}
                  {project.issues && project.issues.filter(i => i.status !== 'Resolved').length > 0 && (
                    <span className="issue-count-badge" title="미해결 이슈">
                      <AlertTriangle size={10} /> {project.issues.filter(i => i.status !== 'Resolved').length}
                    </span>
                  )}
                </h3>
                <p className="project-task">{project.task}</p>

                <div className="card-meta">
                  <div className="meta-item"><Layers size={14} /> {project.area}</div>
                  {project.inspection_date && (
                    <div className="meta-item" title="검수일"><Search size={14} /> {new Date(project.inspection_date).toLocaleDateString()}</div>
                  )}
                  {project.end_date && (
                    <div className="meta-item" title="종료일"><Calendar size={14} /> {new Date(project.end_date).toLocaleDateString()}</div>
                  )}
                  {project.artifactStats && project.artifactStats.total > 0 && (
                    <div
                      className="meta-item"
                      title={`산출물 ${project.artifactStats.done}/${project.artifactStats.total} 완료`}
                      style={{
                        color: project.artifactStats.done === project.artifactStats.total ? '#86efac' : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      <Paperclip size={13} /> {project.artifactStats.done}/{project.artifactStats.total}
                    </div>
                  )}
                  <div className={`badge badge-${project.status.toLowerCase()}`}>{statusMap[project.status]}</div>
                </div>

                <div className="progress-container">
                  <div className="progress-label">
                    <span>진행률</span>
                    <span>{project.progress}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div
                      className={`progress-bar-fill fill-${project.status.toLowerCase()}`}
                      style={{ width: `${project.progress}%`, transition: 'width 1s ease-in-out' }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
            {filteredProjects.filter(p => p.status !== 'Launch').length === 0 && (
              <motion.div
                className="empty-state-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="empty-state-icon">
                  <Rocket size={40} strokeWidth={1} />
                </div>
                <div className="empty-state-text">
                  <h4>진행 중인 프로젝트가 없습니다</h4>
                  <p>새로운 프로젝트를 계획하거나 시작해보세요! ✨</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {showCompleted && (
          <div className="project-group-section completed-area mt-12">
            <div className="section-header border-t border-white/5 pt-10">
              <h3 className="sub-section-title opacity-70">✅ 완료된 프로젝트</h3>
            </div>
            <div className="project-grid mini-grid">
              {filteredProjects.filter(p => p.status === 'Launch').map((project, idx) => (
                <motion.div
                  key={project.id}
                  className="project-card glass card-glow completed-card"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => onSelectProject(project)}
                >
                  <div className="card-header">
                    <span className="group-tag">{project.group_name}</span>
                    <div className="card-actions">
                      <button className="icon-btn xs" onClick={(e) => onEdit(e, project)}><Settings size={14} /></button>
                      <button className="icon-btn xs delete" onClick={(e) => onDelete(e, project.id)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <h3 className="project-title">{project.title}</h3>
                  <div className="card-meta">
                    <div className={`badge badge-launch small`}>완료됨</div>
                    <div className="progress-mini-label">{project.progress}%</div>
                  </div>
                </motion.div>
              ))}
              {filteredProjects.filter(p => p.status === 'Launch').length === 0 && (
                <motion.div
                  className="empty-state-card"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="empty-state-icon">
                    <CheckCircle size={40} strokeWidth={1} />
                  </div>
                  <div className="empty-state-text">
                    <h4>아직 완료된 프로젝트가 없어요</h4>
                    <p>열심히 진행 중인 프로젝트들이 곧 결실을 맺을 거예요! 🏆</p>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  </motion.div>
);

export default DashboardView;
