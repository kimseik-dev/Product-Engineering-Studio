import React from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Rocket, Settings, Trash2 } from 'lucide-react';
import { statusMap } from '../lib/constants';

const ProjectsListView = ({
  filteredProjects,
  showCompleted, onToggleCompleted,
  filter, onFilterChange,
  onSelectProject, onEdit, onDelete, onMemberClick,
}) => {
  const visible = filteredProjects.filter(p => showCompleted || p.status !== 'Launch');

  return (
    <motion.div
      className="projects-list-view"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="list-header glass">
        <div className="list-title-area">
          <h2>📁 프로젝트 전체 목록</h2>
          <p>총 {filteredProjects.length}개의 프로젝트가 관리되고 있습니다.</p>
        </div>
        <div className="list-actions">
          <div className="filters glass compact">
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
      </div>

      <div className="projects-table-container glass">
        <table className="projects-table">
          <thead>
            <tr>
              <th>프로젝트 명</th>
              <th>그룹</th>
              <th>상태</th>
              <th>검수일</th>
              <th>종료일</th>
              <th>진행률</th>
              <th>담당 영역</th>
              <th>멤버</th>
              <th className="text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((project, idx) => (
              <motion.tr
                key={project.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => onSelectProject(project)}
                className="clickable-row"
              >
                <td className="col-title">
                  <div className="project-info-cell">
                    <Rocket size={14} className="cell-icon" />
                    <span>{project.title}</span>
                  </div>
                </td>
                <td><span className="group-tag small">{project.group_name}</span></td>
                <td><div className={`badge badge-${project.status.toLowerCase()} small`}>{statusMap[project.status]}</div></td>
                <td><span className="date-cell">{project.inspection_date ? new Date(project.inspection_date).toLocaleDateString() : '-'}</span></td>
                <td><span className="date-cell">{project.end_date ? new Date(project.end_date).toLocaleDateString() : '-'}</span></td>
                <td className="col-progress">
                  <div className="progress-cell">
                    <span className="progress-text">{project.progress}%</span>
                    <div className="progress-bar-bg mini">
                      <div
                        className={`progress-bar-fill fill-${project.status.toLowerCase()}`}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td><span className="area-label">{project.area}</span></td>
                <td className="members-cell">
                  <div className="member-avatars mini">
                    {project.members && project.members.slice(0, 3).map(m => (
                      <div
                        key={m.id}
                        className="avatar-circle mini cursor-pointer"
                        title={`${m.name} (${m.role})`}
                        onClick={(e) => { e.stopPropagation(); onMemberClick(m.id); }}
                      >
                        {m.avatar ? <img src={m.avatar} alt={m.name} /> : m.name[0]}
                      </div>
                    ))}
                    {project.members && project.members.length > 3 && (
                      <div className="avatar-circle mini more">+{project.members.length - 3}</div>
                    )}
                  </div>
                </td>
                <td className="actions-cell">
                  <div className="row-actions">
                    <button className="icon-btn small" onClick={(e) => onEdit(e, project)}><Settings size={14} /></button>
                    <button className="icon-btn small delete" onClick={(e) => onDelete(e, project.id)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </motion.tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan="9" className="empty-row">검색 결과가 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default ProjectsListView;
