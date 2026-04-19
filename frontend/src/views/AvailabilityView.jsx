import React from 'react';
import { motion } from 'framer-motion';

const fmt = (d) => d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });

const AvailabilityView = ({ memberAvailability, availabilityBasis, onBasisChange }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysFromToday = (d) => Math.round((d - today) / 86400000);

  const nowCount = memberAvailability.filter(r => r.isAvailableNow).length;
  const busyCount = memberAvailability.length - nowCount;

  return (
    <motion.div
      className="availability-view"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="list-header glass" style={{ flexWrap: 'wrap', gap: 14 }}>
        <div className="list-title-area">
          <h2>📅 팀 가용성</h2>
          <p>
            오늘 기준 <b style={{ color: '#4ade80' }}>{nowCount}명</b> 즉시 투입 가능 ·
            <b style={{ color: '#fbbf24', marginLeft: 6 }}>{busyCount}명</b> 개발 중
            <span style={{ marginLeft: 8, opacity: 0.5 }}>(검수 단계는 투입 가능으로 계산)</span>
          </p>
        </div>
        <div className="availability-basis-toggle">
          <span className="sort-label">투입 가능일 기준</span>
          <select value={availabilityBasis} onChange={(e) => onBasisChange(e.target.value)} className="sort-select">
            <option value="auto">🤖 자동 (개발 종료일 우선)</option>
            <option value="development">⚙️ 개발 종료일</option>
            <option value="inspection">🔍 검수 시작일</option>
          </select>
        </div>
      </div>

      {memberAvailability.length === 0 ? (
        <div className="glass" style={{ padding: 60, textAlign: 'center', borderRadius: 24, marginTop: 24, opacity: 0.6 }}>
          등록된 멤버가 없습니다.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
          {memberAvailability.map(({ member, availableDate, isAvailableNow, datedProjects, undatedProjects, blockingProjects }, idx) => {
            const days = availableDate ? daysFromToday(availableDate) : 0;
            const urgencyColor = isAvailableNow
              ? '#4ade80'
              : days <= 14 ? '#fbbf24'
              : days <= 30 ? '#fb923c'
              : '#f87171';

            return (
              <motion.div
                key={member.id}
                className="glass"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                style={{
                  padding: '18px 22px',
                  borderRadius: 20,
                  display: 'grid',
                  gridTemplateColumns: '56px 1fr auto',
                  gap: 18,
                  alignItems: 'center',
                  borderLeft: `4px solid ${urgencyColor}`,
                }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 20, overflow: 'hidden'
                }}>
                  {member.avatar
                    ? <img src={member.avatar} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : member.name[0]}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 17, fontWeight: 700 }}>{member.name}</span>
                    <span style={{ fontSize: 13, opacity: 0.5 }}>{member.role}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {blockingProjects.length === 0 ? (
                      <span style={{ fontSize: 13, opacity: 0.45 }}>진행 중인 개발 과업 없음</span>
                    ) : (
                      <>
                        {datedProjects.map(({ project, date }) => (
                          <span key={project.id} style={{
                            fontSize: 12, padding: '4px 10px', borderRadius: 999,
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.08)'
                          }}>
                            {project.title} <span style={{ opacity: 0.5 }}>· {fmt(date)}</span>
                          </span>
                        ))}
                        {undatedProjects.map(p => (
                          <span key={p.id} style={{
                            fontSize: 12, padding: '4px 10px', borderRadius: 999,
                            background: 'rgba(248, 113, 113, 0.08)',
                            border: '1px solid rgba(248, 113, 113, 0.25)',
                            color: '#fca5a5'
                          }}>
                            {p.title} <span style={{ opacity: 0.6 }}>· 일정 미정</span>
                          </span>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: urgencyColor, lineHeight: 1.1 }}>
                    {isAvailableNow
                      ? '지금 가능'
                      : availableDate ? fmt(availableDate) : '—'}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.55, marginTop: 4 }}>
                    {isAvailableNow
                      ? (blockingProjects.length === 0 ? '대기 중' : '검수 단계')
                      : `${days}일 후`}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default AvailabilityView;
