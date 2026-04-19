import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, CheckCircle, Settings, Trash2, Search, X,
  ChevronDown, ChevronRight, Calendar, Users, Hash, Award, TrendingUp
} from 'lucide-react';

const formatMonthKey = (dateStr) => {
  if (!dateStr) return '날짜 미정';
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
};

const formatShortDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR', { year: '2-digit', month: 'short', day: 'numeric' });
};

const CompletedProjects = ({ projects = [], onProjectClick, onEdit, onDelete, onMemberClick }) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [yearFilter, setYearFilter] = useState('All');
  const [groupFilter, setGroupFilter] = useState('All');
  const [collapsedMonths, setCollapsedMonths] = useState({});

  const completed = useMemo(() => projects.filter(p => p.status === 'Launch'), [projects]);

  // 연도/그룹 옵션
  const years = useMemo(() => {
    const set = new Set();
    completed.forEach(p => {
      if (p.end_date) set.add(new Date(p.end_date).getFullYear());
    });
    return [...set].sort((a, b) => b - a);
  }, [completed]);

  const groups = useMemo(() => {
    const set = new Set();
    completed.forEach(p => p.group_name && set.add(p.group_name));
    return [...set].sort();
  }, [completed]);

  // 필터 + 검색 + 정렬
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = completed.filter(p => {
      const yearMatch = yearFilter === 'All' || (p.end_date && new Date(p.end_date).getFullYear() === Number(yearFilter));
      const groupMatch = groupFilter === 'All' || p.group_name === groupFilter;
      const searchMatch = !q ||
        p.title?.toLowerCase().includes(q) ||
        p.group_name?.toLowerCase().includes(q) ||
        p.area?.toLowerCase().includes(q) ||
        (p.members || []).some(m => m.name?.toLowerCase().includes(q));
      return yearMatch && groupMatch && searchMatch;
    });

    if (sortBy === 'recent') {
      list.sort((a, b) => new Date(b.end_date || 0) - new Date(a.end_date || 0));
    } else if (sortBy === 'oldest') {
      list.sort((a, b) => new Date(a.end_date || 0) - new Date(b.end_date || 0));
    } else if (sortBy === 'name') {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }
    return list;
  }, [completed, search, sortBy, yearFilter, groupFilter]);

  // 월별 그룹핑
  const monthGroups = useMemo(() => {
    const groupsMap = {};
    filtered.forEach(p => {
      const key = formatMonthKey(p.end_date);
      if (!groupsMap[key]) groupsMap[key] = [];
      groupsMap[key].push(p);
    });
    return Object.entries(groupsMap);
  }, [filtered]);

  // 상단 통계
  const stats = useMemo(() => {
    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth();

    const thisYearCount = completed.filter(p =>
      p.end_date && new Date(p.end_date).getFullYear() === thisYear
    ).length;
    const thisMonthCount = completed.filter(p => {
      if (!p.end_date) return false;
      const d = new Date(p.end_date);
      return d.getFullYear() === thisYear && d.getMonth() === thisMonth;
    }).length;

    // 평균 기간 (end_date - created_at)
    const durations = completed
      .filter(p => p.end_date && p.created_at)
      .map(p => (new Date(p.end_date) - new Date(p.created_at)) / (1000 * 60 * 60 * 24));
    const avgDays = durations.length
      ? Math.round(durations.reduce((s, v) => s + v, 0) / durations.length)
      : 0;

    // 멤버별 기여도
    const memberCounts = {};
    completed.forEach(p => {
      (p.members || []).forEach(m => {
        memberCounts[m.id] = (memberCounts[m.id] || 0) + 1;
      });
    });
    const topContributor = Object.entries(memberCounts).sort((a, b) => b[1] - a[1])[0];
    const topMember = topContributor
      ? { ...completed.flatMap(p => p.members || []).find(m => String(m.id) === String(topContributor[0])), count: topContributor[1] }
      : null;

    return { total: completed.length, thisYearCount, thisMonthCount, avgDays, topMember };
  }, [completed]);

  const toggleMonth = (key) => {
    setCollapsedMonths(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const hasFilter = search || yearFilter !== 'All' || groupFilter !== 'All';

  return (
    <motion.div
      className="completed-projects-view"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* 헤더 */}
      <div className="list-header glass">
        <div className="list-title-area">
          <h2><Trophy size={24} style={{ color: '#fbbf24', display: 'inline', marginRight: 6, verticalAlign: 'middle' }} /> 완료된 프로젝트</h2>
          <p>성공적으로 마무리한 {stats.total}개의 프로젝트 기록 🏆</p>
        </div>
      </div>

      {/* 통계 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginTop: 18 }}>
        <StatCard
          icon={<Trophy size={20} />}
          label="전체 완료"
          value={stats.total}
          unit="개"
          color="#fbbf24"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="올해 완료"
          value={stats.thisYearCount}
          unit="개"
          color="#4ade80"
        />
        <StatCard
          icon={<Calendar size={20} />}
          label="이번 달"
          value={stats.thisMonthCount}
          unit="개"
          color="#60a5fa"
        />
        <StatCard
          icon={<CheckCircle size={20} />}
          label="평균 진행 기간"
          value={stats.avgDays}
          unit="일"
          color="#a78bfa"
        />
        {stats.topMember && (
          <StatCard
            icon={<Award size={20} />}
            label="최다 참여 멤버"
            value={stats.topMember.name}
            unit={`${stats.topMember.count}개`}
            color="#f472b6"
            avatar={stats.topMember.avatar}
            textValue
          />
        )}
      </div>

      {/* 검색 + 필터 + 정렬 */}
      <div
        className="glass"
        style={{
          marginTop: 18,
          padding: 14,
          borderRadius: 16,
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div className="taskboard-search" style={{ flex: '1 1 260px' }}>
          <Search size={14} style={{ opacity: 0.6 }} />
          <input
            type="text"
            placeholder="프로젝트·그룹·영역·멤버 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="taskboard-search-clear" onClick={() => setSearch('')} title="지우기">
              <X size={12} />
            </button>
          )}
        </div>

        <FilterSelect
          label="연도"
          value={yearFilter}
          onChange={setYearFilter}
          options={[{ v: 'All', l: '전체' }, ...years.map(y => ({ v: String(y), l: `${y}년` }))]}
        />
        <FilterSelect
          label="그룹"
          value={groupFilter}
          onChange={setGroupFilter}
          options={[{ v: 'All', l: '전체' }, ...groups.map(g => ({ v: g, l: g }))]}
        />
        <FilterSelect
          label="정렬"
          value={sortBy}
          onChange={setSortBy}
          options={[
            { v: 'recent', l: '🆕 최근 완료순' },
            { v: 'oldest', l: '🕰️ 오래된 순' },
            { v: 'name', l: '🔤 이름 순' },
          ]}
        />
        {hasFilter && (
          <button
            className="action-btn outline"
            onClick={() => { setSearch(''); setYearFilter('All'); setGroupFilter('All'); }}
            style={{ padding: '8px 14px', fontSize: 12 }}
          >
            <X size={14} /> 초기화
          </button>
        )}

        <div style={{ marginLeft: 'auto', fontSize: 13, opacity: 0.6 }}>
          {filtered.length !== completed.length
            ? <>필터 결과 <b style={{ color: 'white' }}>{filtered.length}</b> / {completed.length}</>
            : <>총 <b style={{ color: 'white' }}>{filtered.length}</b>개</>}
        </div>
      </div>

      {/* 월별 그룹 */}
      {filtered.length === 0 ? (
        <div className="glass" style={{ padding: 60, textAlign: 'center', borderRadius: 20, marginTop: 20, opacity: 0.55 }}>
          {hasFilter ? '조건에 맞는 프로젝트가 없어요.' : '아직 완료된 프로젝트가 없습니다.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
          {monthGroups.map(([monthKey, list]) => {
            const isCollapsed = collapsedMonths[monthKey];
            return (
              <div key={monthKey} className="completed-month-group">
                <button
                  className="completed-month-header"
                  onClick={() => toggleMonth(monthKey)}
                >
                  {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                  <span className="completed-month-title">{monthKey}</span>
                  <span className="completed-month-count">{list.length}개</span>
                </button>

                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="completed-cards-grid">
                        {list.map((project, idx) => (
                          <motion.div
                            key={project.id}
                            className="completed-project-card"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            onClick={() => onProjectClick?.(project)}
                          >
                            <div className="card-accent" />

                            <div className="cp-card-head">
                              <div className="cp-card-title-area">
                                <CheckCircle size={16} className="cp-check" />
                                <h3>{project.title}</h3>
                              </div>
                              <div className="cp-card-actions">
                                <button className="icon-btn xs" onClick={(e) => { e.stopPropagation(); onEdit?.(e, project); }} title="편집">
                                  <Settings size={13} />
                                </button>
                                <button className="icon-btn xs delete" onClick={(e) => { e.stopPropagation(); onDelete?.(e, project.id); }} title="삭제">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>

                            <div className="cp-card-meta">
                              {project.group_name && (
                                <span className="cp-meta-chip">
                                  <Hash size={11} /> {project.group_name}
                                </span>
                              )}
                              {project.area && (
                                <span className="cp-meta-chip subtle">{project.area}</span>
                              )}
                              {project.end_date && (
                                <span className="cp-meta-chip date">
                                  <Calendar size={11} /> {formatShortDate(project.end_date)}
                                </span>
                              )}
                            </div>

                            <div className="cp-card-footer">
                              <div className="cp-members">
                                {(project.members || []).slice(0, 5).map(m => (
                                  <div
                                    key={m.id}
                                    className="cp-avatar"
                                    title={`${m.name} · ${m.role || ''}`}
                                    onClick={(e) => { e.stopPropagation(); onMemberClick?.(m.id); }}
                                  >
                                    {m.avatar ? <img src={m.avatar} alt={m.name} /> : m.name[0]}
                                  </div>
                                ))}
                                {(project.members || []).length > 5 && (
                                  <div className="cp-avatar overflow">+{project.members.length - 5}</div>
                                )}
                                {(!project.members || project.members.length === 0) && (
                                  <span style={{ fontSize: 11, opacity: 0.4 }}><Users size={11} /> 멤버 없음</span>
                                )}
                              </div>
                              <div className="cp-progress">
                                <span className="cp-progress-label">100%</span>
                                <div className="cp-progress-track">
                                  <div className="cp-progress-fill" />
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

const StatCard = ({ icon, label, value, unit, color, avatar, textValue }) => (
  <motion.div
    className="glass"
    whileHover={{ y: -2 }}
    style={{
      padding: 16,
      borderRadius: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      borderLeft: `3px solid ${color}`,
    }}
  >
    <div
      style={{
        width: 42, height: 42, borderRadius: 12,
        background: `${color}1a`,
        color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : icon}
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, opacity: 0.55, fontWeight: 600, letterSpacing: '0.3px', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: textValue ? 16 : 22, fontWeight: 800, color: textValue ? 'white' : color, lineHeight: 1.1 }}>
          {value}
        </span>
        <span style={{ fontSize: 11, opacity: 0.55 }}>{unit}</span>
      </div>
    </div>
  </motion.div>
);

const FilterSelect = ({ label, value, onChange, options }) => (
  <div className="taskboard-sort">
    <span className="sort-label">{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="sort-select">
      {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>
);

export default CompletedProjects;
