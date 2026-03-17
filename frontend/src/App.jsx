import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  CheckSquare, 
  Users, 
  Settings, 
  Filter, 
  Search,
  MoreVertical,
  Calendar,
  Layers,
  Rocket,
  Trash2,
  UserPlus,
  X,
  Plus,
  Hash,
  AlertCircle,
  AlertTriangle,
  Circle,
  Clock,
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './lib/supabase';
import TaskBoard from './components/TaskBoard';
import IssueTracker from './components/IssueTracker';
import './App.css';

const statusMap = {
  'All': '전체',
  'Development': '개발 중',
  'Review': '검수 중',
  'Launch': '출시'
};

const App = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [taskFilterMemberId, setTaskFilterMemberId] = useState('All');

  // CRUD States (Projects)
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectForm, setProjectForm] = useState({
    title: '',
    group_name: '',
    task: '',
    status: 'Development',
    area: '',
    progress: 0,
    end_date: ''
  });

  // CRUD States (Members)
  const [allMembers, setAllMembers] = useState([]);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);
  const [memberForm, setMemberForm] = useState({
    name: '',
    role: '',
    avatar: '',
    status: 'Active'
  });

  const [errorStatus, setErrorStatus] = useState(null);
  const [debugLogs, setDebugLogs] = useState([]);

  const addLog = (msg) => {
    setDebugLogs(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const fetchProjects = async () => {
    try {
      addLog('Fetching data from Supabase...');
      setLoading(true);
      setErrorStatus(null);
      
      const [projRes, memRes, relRes, issueRes] = await Promise.all([
        supabase.from('projects').select('*').order('id', { ascending: true }),
        supabase.from('members').select('*'),
        supabase.from('_ProjectMembers').select('*'),
        supabase.from('issues').select('*')
      ]);

      if (projRes.error) throw projRes.error;
      if (memRes.error) throw memRes.error;
      if (relRes.error) throw relRes.error;
      if (issueRes.error) throw issueRes.error;

      // Global members state for Team view
      setAllMembers(memRes.data);

      const combinedData = projRes.data.map(project => {
        const associatedMemberIds = relRes.data
          .filter(rel => String(rel.A) === String(project.id))
          .map(rel => String(rel.B));

        const projMembers = memRes.data.filter(m => associatedMemberIds.includes(String(m.id)));
        const projIssues = issueRes.data.filter(i => String(i.project_id) === String(project.id));
        
        return { 
          ...project, 
          members: projMembers,
          issues: projIssues
        };
      });
      
      addLog(`Success! Combined ${combinedData.length} projects.`);
      setProjects(combinedData);
    } catch (error) {
      addLog(`Error: ${error.message}`);
      setErrorStatus(error.message);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingProject(null);
    setProjectForm({
      title: '',
      group_name: '',
      task: '',
      status: 'Development',
      area: '',
      progress: 0,
      end_date: ''
    });
    setShowFormModal(true);
  };

  const openEditModal = (e, project) => {
    e?.stopPropagation();
    setEditingProject(project);
    setProjectForm({
      title: project.title,
      group_name: project.group_name,
      task: project.task || '',
      status: project.status,
      area: project.area,
      progress: project.progress,
      end_date: project.end_date ? project.end_date.split('T')[0] : ''
    });
    setShowFormModal(true);
  };

  const handleSaveProject = async () => {
    if (!projectForm.title || !projectForm.group_name) {
      alert('프로젝트 명과 그룹명은 필수입니다~ 대표님! 😅');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Data Cleaning: Convert empty end_date to null for Supabase
      const payload = {
        ...projectForm,
        end_date: projectForm.end_date === '' ? null : projectForm.end_date
      };

      if (editingProject) {
        const { error } = await supabase
          .from('projects')
          .update(payload)
          .eq('id', editingProject.id);
        if (error) throw error;
        addLog(`Project "${projectForm.title}" updated.`);
      } else {
        const { error } = await supabase
          .from('projects')
          .insert([payload]);
        if (error) throw error;
        addLog(`New project "${projectForm.title}" created.`);
      }
      setShowFormModal(false);
      fetchProjects();
    } catch (error) {
      alert(`저장 중 오류가 발생했어요: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async (e, id) => {
    e?.stopPropagation();
    if (!window.confirm('정말 이 프로젝트를 삭제하시겠어요? 이 작업은 되돌릴 수 없습니다. ⚠️')) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      if (error) throw error;
      addLog(`Project ID ${id} deleted.`);
      fetchProjects();
      if (selectedProject?.id === id) setSelectedProject(null);
    } catch (error) {
      alert(`삭제 중 오류가 발생했어요: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Member CRUD Functions ---
  const openCreateMemberModal = () => {
    setEditingMember(null);
    setMemberForm({
      name: '',
      role: '',
      avatar: '',
      status: 'Active'
    });
    setShowMemberModal(true);
  };

  const openEditMemberModal = (member) => {
    setEditingMember(member);
    setMemberForm({
      name: member.name,
      role: member.role,
      avatar: member.avatar || '',
      status: member.status
    });
    setShowMemberModal(true);
  };

  const handleSaveMember = async () => {
    if (!memberForm.name || !memberForm.role) {
      alert('이름과 역할은 필수입니다~ 대표님! 😅');
      return;
    }

    try {
      setIsSubmittingMember(true);
      if (editingMember) {
        const { error } = await supabase
          .from('members')
          .update(memberForm)
          .eq('id', editingMember.id);
        if (error) throw error;
        addLog(`Member "${memberForm.name}" updated.`);
      } else {
        const { error } = await supabase
          .from('members')
          .insert([memberForm]);
        if (error) throw error;
        addLog(`New member "${memberForm.name}" registered.`);
      }
      setShowMemberModal(false);
      fetchProjects(); // List update
    } catch (error) {
      alert(`저장 중 오류가 발생했어요: ${error.message}`);
    } finally {
      setIsSubmittingMember(false);
    }
  };

  const handleDeleteMember = async (id) => {
    if (!window.confirm('정말 이 팀원을 삭제하시겠어요? 삭제 시 모든 프로젝트 배정에서도 제외됩니다. ⚠️')) return;
    try {
      setLoading(true);
      // Prisma says _ProjectMembers is relation table. 
      // Deleting member will typically cascade if defined, but better fetch again.
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id);
      if (error) throw error;
      addLog(`Member ID ${id} deleted.`);
      fetchProjects();
    } catch (error) {
      alert(`삭제 중 오류가 발생했어요: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMemberClick = (memberId) => {
    setTaskFilterMemberId(memberId);
    setActiveMenu('tasks');
    setSelectedProject(null); // Close modal if open
  };

  React.useEffect(() => {
    fetchProjects();

    // Set up Realtime subscription for projects and members
    const channels = supabase.channel('pes_db_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => fetchProjects())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => fetchProjects())
      .on('postgres_changes', { event: '*', schema: 'public', table: '_ProjectMembers' }, () => fetchProjects())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, () => fetchProjects())
      .subscribe();

    return () => {
      supabase.removeChannel(channels);
    };
  }, []);

  const filteredProjects = projects.filter(p => {
    const matchesFilter = filter === 'All' || p.status === filter;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (p.group_name && p.group_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const stats = [
    { label: '대기 중', value: projects.filter(p => !p.status || p.status === 'Pending').length, color: 'rgba(255, 255, 255, 0.5)' },
    { label: '진행 중', value: projects.filter(p => p.status === 'Development').length, color: 'var(--info-gradient)' },
    { label: '검수 중', value: projects.filter(p => p.status === 'Review').length, color: 'var(--primary-gradient)' },
    { label: '완료', value: projects.filter(p => p.status === 'Launch').length, color: 'var(--success-gradient)' },
  ];

  const menuItems = [
    { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
    { id: 'projects', label: '프로젝트', icon: Briefcase },
    { id: 'tasks', label: '작업', icon: CheckSquare },
    { id: 'issues', label: '이슈', icon: AlertTriangle },
    { id: 'team', label: '팀', icon: Users },
    { id: 'settings', label: '설정', icon: Settings },
  ];

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Stats Row */}
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

            {/* Filters and Grid */}
            <section className="projects-section">
              <div className="section-header">
                <h2 className="section-title">전체 프로젝트 대시보드</h2>
                {loading && <span className="loading-spinner">데이터 불러오는 중...</span>}
                {errorStatus && <span className="error-message" style={{ color: '#ff4d4d', marginLeft: '10px' }}>구성 오류: {errorStatus}</span>}
                <div className="filters glass">
                  {Object.keys(statusMap).map((f) => (
                    <button 
                      key={f} 
                      className={`filter-btn ${filter === f ? 'active' : ''}`}
                      onClick={() => setFilter(f)}
                    >
                      {statusMap[f]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="project-sections-container">
                {/* Current Projects Section */}
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
                        onClick={() => setSelectedProject(project)}
                      >
                        <div className="card-header">
                        <span className="group-tag">{project.group_name}</span>
                        <div className="card-actions">
                          <button className="icon-btn xs" onClick={(e) => openEditModal(e, project)}><Settings size={14} /></button>
                          <button className="icon-btn xs delete" onClick={(e) => handleDeleteProject(e, project.id)}><Trash2 size={14} /></button>
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
                          {project.end_date && (
                            <div className="meta-item" title="종료일"><Calendar size={14} /> {new Date(project.end_date).toLocaleDateString()}</div>
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
                              style={{ 
                                width: `${project.progress}%`,
                                transition: 'width 1s ease-in-out'
                              }}
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

                {/* Completed Projects Section */}
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
                        onClick={() => setSelectedProject(project)}
                      >
                        <div className="card-header">
                        <span className="group-tag">{project.group_name}</span>
                        <div className="card-actions">
                          <button className="icon-btn xs" onClick={(e) => openEditModal(e, project)}><Settings size={14} /></button>
                          <button className="icon-btn xs delete" onClick={(e) => handleDeleteProject(e, project.id)}><Trash2 size={14} /></button>
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
              </div>
            </section>
          </motion.div>
        );
      case 'projects':
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
                  {Object.keys(statusMap).map((f) => (
                    <button 
                      key={f} 
                      className={`filter-btn ${filter === f ? 'active' : ''}`}
                      onClick={() => setFilter(f)}
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
                    <th>종료일</th>
                    <th>진행률</th>
                    <th>담당 영역</th>
                    <th>멤버</th>
                    <th className="text-right">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((project, idx) => (
                    <motion.tr 
                      key={project.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => setSelectedProject(project)}
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
                        <div className="member-avatars">
                          {project.members && project.members.slice(0, 3).map(m => (
                            <div 
                              key={m.id} 
                              className="member-avatar mini cursor-pointer" 
                              title={`${m.name} (${m.role})`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMemberClick(m.id);
                              }}
                            >
                              {m.avatar ? <img src={m.avatar} alt={m.name} /> : m.name[0]}
                            </div>
                          ))}
                          {project.members && project.members.length > 3 && (
                            <div className="member-avatar-more">+{project.members.length - 3}</div>
                          )}
                        </div>
                      </td>
                      <td className="actions-cell">
                        <div className="row-actions">
                          <button className="icon-btn small" onClick={(e) => openEditModal(e, project)}><Settings size={14} /></button>
                          <button className="icon-btn small delete" onClick={(e) => handleDeleteProject(e, project.id)}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                  {filteredProjects.length === 0 && (
                    <tr>
                      <td colSpan="8" className="empty-row">검색 결과가 없습니다.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        );
      case 'tasks':
        return (
          <motion.div 
            className="tasks-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <TaskBoard 
              members={allMembers} 
              projects={projects} 
              initialMemberId={taskFilterMemberId} 
              onProjectUpdate={fetchProjects}
            />
          </motion.div>
        );
      case 'issues':
        return (
          <motion.div 
            className="issues-view"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <IssueTracker 
              members={allMembers} 
              projects={projects} 
              onUpdate={fetchProjects}
            />
          </motion.div>
        );
      case 'team':
        return (
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
              <button className="action-btn primary" onClick={openCreateMemberModal}>
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
                >
                  <div className="member-card-actions">
                    <button className="icon-btn xs" onClick={() => openEditMemberModal(member)}><Settings size={14} /></button>
                    <button className="icon-btn xs delete" onClick={() => handleDeleteMember(member.id)}><Trash2 size={14} /></button>
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
      case 'settings':
        return (
          <motion.div 
            className="menu-placeholder-view glass"
            initial={{ opacity: 0, rotate: -2 }}
            animate={{ opacity: 1, rotate: 0 }}
          >
            <h2>⚙️ 환경 설정</h2>
            <p>알림 설정부터 프로필 관리까지! (영자가 안전하게 세팅해드릴게요~ 🛠️)</p>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar glass">
        <div className="logo-container">
          <Rocket className="logo-icon" />
          <h2 className="logo-text">HERO</h2>
        </div>
        <nav className="nav-menu">
          {menuItems.map((item) => (
            <div 
              key={item.id}
              className={`nav-item ${activeMenu === item.id ? 'active' : ''}`}
              onClick={() => {
                setActiveMenu(item.id);
                if (item.id !== 'tasks') setTaskFilterMemberId('All');
              }}
            >
              <item.icon size={20} />
              {item.label}
            </div>
          ))}
          <div className="nav-divider"></div>
          <button className="create-project-btn" onClick={openCreateModal}>
            <Rocket size={18} /> 새 프로젝트 추가
          </button>
        </nav>
        <div className="sidebar-footer">
          <p className="footer-text">Built by 김부장🎨</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div className="header-left">
            <h1 className="title">Product Engineering Studio</h1>
            <p className="subtitle">
              {menuItems.find(m => m.id === activeMenu)?.label} &middot; {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
            </p>
          </div>
          <div className="header-right">
            <div className="search-bar glass">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="프로젝트 검색..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <React.Fragment key={activeMenu}>
            {renderContent()}
          </React.Fragment>
        </AnimatePresence>
      </main>

      {/* Project Detail Modal */}
      <AnimatePresence>
        {selectedProject && (
          <div className="modal-overlay" onClick={() => setSelectedProject(null)}>
            <motion.div 
              className={`modal-content glass premium-modal status-${selectedProject.status.toLowerCase()}`}
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Decorative background orb */}
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
                  <h2 className="modal-title">{selectedProject.title}</h2>
                  <div className={`badge badge-${selectedProject.status.toLowerCase()} modal-badge`}>
                    <span className="pulse-dot"></span>
                    {statusMap[selectedProject.status]}
                  </div>
                  {selectedProject.end_date && (
                    <div className="modal-date-info">
                      <Calendar size={14} /> 
                      <span>종료일: {new Date(selectedProject.end_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <div className="modal-header-actions">
                  <button className="icon-btn small" title="수정" onClick={(e) => { openEditModal(e, selectedProject); setSelectedProject(null); }}><Settings size={14} /></button>
                  <button className="icon-btn small delete" title="삭제" onClick={(e) => { handleDeleteProject(e, selectedProject.id); }}><Trash2 size={14} /></button>
                  <button className="close-btn" onClick={() => setSelectedProject(null)}><X size={20} /></button>
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
                  <p>{selectedProject.task || '진행 중인 작업 내용이 없습니다.'}</p>
                </motion.div>

                <div className="detail-item members-section">
                  <h3><Users size={16} /> 참여 프로젝트 멤버</h3>
                  <div className="modal-member-list">
                    {selectedProject.members && selectedProject.members.length > 0 ? (
                      selectedProject.members.map((member, index) => (
                        <motion.div 
                          key={member.id} 
                          className="modal-member-item cursor-pointer"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + (index * 0.05) }}
                          onClick={() => handleMemberClick(member.id)}
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
                      <span className="area-text">{selectedProject.area}</span>
                      <span className="progress-value">{selectedProject.progress}%</span>
                    </div>
                    <div className="progress-bar-bg larger">
                      <motion.div 
                        className={`progress-bar-fill fill-${selectedProject.status.toLowerCase()}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${selectedProject.progress}%` }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                      ></motion.div>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="modal-footer">
                <button className="action-btn primary" onClick={(e) => { setSelectedProject(null); openEditModal(e, selectedProject); }}>업데이트</button>
                <button className="action-btn outline" onClick={() => setSelectedProject(null)}>닫기</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Project Form Modal (Create/Edit) */}
      <AnimatePresence>
        {showFormModal && (
          <div className="modal-overlay" onClick={() => setShowFormModal(false)}>
            <motion.div 
              className="modal-content glass premium-modal form-modal"
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>{editingProject ? '프로젝트 수정' : '새 프로젝트 추가'}</h2>
                <button className="close-btn" onClick={() => setShowFormModal(false)}><X size={20} /></button>
              </div>
              
              <div className="form-body custom-scrollbar">
                <div className="form-grid">
                  <div className="form-field full">
                    <label><Hash size={14} /> 프로젝트 명</label>
                    <input 
                      type="text" 
                      placeholder="예: AI 비서 영자 고도화"
                      value={projectForm.title}
                      onChange={(e) => setProjectForm({...projectForm, title: e.target.value})}
                      className="glass-input"
                    />
                  </div>
                  <div className="form-field">
                    <label><Users size={14} /> 그룹명</label>
                    <input 
                      type="text" 
                      placeholder="예: Connect AI LAB"
                      value={projectForm.group_name}
                      onChange={(e) => setProjectForm({...projectForm, group_name: e.target.value})}
                      className="glass-input"
                    />
                  </div>
                  <div className="form-field">
                    <label><Layers size={14} /> 개발 영역</label>
                    <input 
                      type="text" 
                      placeholder="예: Frontend, Mobile"
                      value={projectForm.area}
                      onChange={(e) => setProjectForm({...projectForm, area: e.target.value})}
                      className="glass-input"
                    />
                  </div>
                  <div className="form-field full">
                    <label><Circle size={14} /> 현재 작업 내용</label>
                    <textarea 
                      placeholder="무슨 작업을 하고 있나요?"
                      value={projectForm.task}
                      onChange={(e) => setProjectForm({...projectForm, task: e.target.value})}
                      className="glass-input"
                    />
                  </div>
                  <div className="form-field">
                    <label><AlertCircle size={14} /> 현재 상태</label>
                    <select 
                      value={projectForm.status}
                      onChange={(e) => setProjectForm({...projectForm, status: e.target.value})}
                      className="glass-input select-premium"
                    >
                      <option value="Pending">🛡️ 대기</option>
                      <option value="Development">🚀 진행</option>
                      <option value="Review">🔍 검수 중</option>
                      <option value="Launch">🏁 완료</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label><Clock size={14} /> 프로젝트 진행률</label>
                    <div className="slider-wrapper">
                      <input 
                        type="range" 
                        min="0" 
                        max="100"
                        value={projectForm.progress}
                        onChange={(e) => setProjectForm({...projectForm, progress: parseInt(e.target.value)})}
                        className="glass-slider"
                      />
                      <span className="slider-value">{projectForm.progress}%</span>
                    </div>
                  </div>
                  <div className="form-field">
                    <label><Calendar size={14} /> 프로젝트 종료일</label>
                    <input 
                      type="date" 
                      value={projectForm.end_date}
                      onChange={(e) => setProjectForm({...projectForm, end_date: e.target.value})}
                      className="glass-input"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  className="action-btn primary" 
                  onClick={handleSaveProject}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '저장 중...' : (editingProject ? '변경사항 저장' : <><Plus size={18} /> 프로젝트 생성</>)}
                </button>
                <button className="action-btn outline" onClick={() => setShowFormModal(false)}>취소</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Team Member Form Modal (Create/Edit) */}
      <AnimatePresence>
        {showMemberModal && (
          <div className="modal-overlay" onClick={() => setShowMemberModal(false)}>
            <motion.div 
              className="modal-content glass premium-modal form-modal"
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>{editingMember ? '멤버 정보 수정' : '새 팀 멤버 초대'}</h2>
                <button className="close-btn" onClick={() => setShowMemberModal(false)}><X size={20} /></button>
              </div>
              
              <div className="form-body custom-scrollbar">
                <div className="form-grid">
                  <div className="form-field">
                    <label>이름</label>
                    <input 
                      type="text" 
                      placeholder="예: 김영자"
                      value={memberForm.name}
                      onChange={(e) => setMemberForm({...memberForm, name: e.target.value})}
                      className="glass-input"
                    />
                  </div>
                  <div className="form-field">
                    <label>역할</label>
                    <select 
                      value={memberForm.role}
                      onChange={(e) => setMemberForm({...memberForm, role: e.target.value})}
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
                    <label>아바타 이미지 URL</label>
                    <input 
                      type="text" 
                      placeholder="https://..."
                      value={memberForm.avatar}
                      onChange={(e) => setMemberForm({...memberForm, avatar: e.target.value})}
                      className="glass-input"
                    />
                  </div>
                  <div className="form-field full">
                    <label>상태</label>
                    <div className="status-radio-group">
                      {[
                        { val: 'Away', label: '대기' },
                        { val: 'Active', label: '진행' },
                        { val: 'Offline', label: '완료' }
                      ].map(st => (
                        <label key={st.val} className={`status-radio ${memberForm.status === st.val ? 'active' : ''}`}>
                          <input 
                            type="radio" 
                            name="member-status" 
                            value={st.val} 
                            checked={memberForm.status === st.val}
                            onChange={(e) => setMemberForm({...memberForm, status: e.target.value})}
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
                  onClick={handleSaveMember}
                  disabled={isSubmittingMember}
                >
                  {isSubmittingMember ? '처리 중...' : (editingMember ? '수정 완료' : <><Plus size={18} /> 멤버 초대하기</>)}
                </button>
                <button className="action-btn outline" onClick={() => setShowMemberModal(false)}>취소</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
