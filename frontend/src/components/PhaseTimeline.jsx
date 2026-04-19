import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

export const PHASES = [
  { key: 'planning', label: '기획', emoji: '📋', color: '#a78bfa' },
  { key: 'design', label: '디자인', emoji: '🎨', color: '#f472b6' },
  { key: 'development', label: '개발', emoji: '⚙️', color: '#60a5fa' },
  { key: 'test', label: '테스트', emoji: '🧪', color: '#4ade80' },
];

const toDate = (s) => (s ? new Date(String(s).split('T')[0] + 'T00:00:00') : null);
const fmt = (d) => d ? d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) : '';
const fmtFull = (d) => d ? d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

/**
 * 프로젝트의 현재 단계 상태를 판단.
 * - active: 오늘이 어떤 단계 [start,end] 안에 있음
 * - overdue: 마지막으로 종료되었어야 할 단계의 end가 지났는데 다음 단계가 시작 안 됨
 * - upcoming: 시작 전
 * - completed: 모든 단계 종료됨
 * - empty: 단계 정보 없음
 */
export const getProjectPhaseStatus = (project) => {
  if (!project) return { state: 'empty' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const phases = PHASES.map(p => ({
    ...p,
    start: toDate(project[`${p.key}_start`]),
    end: toDate(project[`${p.key}_end`]),
  }));

  const anySet = phases.some(p => p.start || p.end);
  if (!anySet) return { state: 'empty' };

  // 진행 중 단계
  const active = phases.find(p => p.start && p.end && today >= p.start && today <= p.end);
  if (active) {
    const daysLeft = Math.round((active.end - today) / 86400000);
    return {
      state: 'active',
      phase: active,
      daysLeft,
    };
  }

  // 지연 단계: end가 지났는데 다음 단계 start는 아직 도래하지 않음
  // phases are ordered; find the latest one whose end < today and the "gap" afterwards.
  let lastEnded = null;
  for (const p of phases) {
    if (p.end && today > p.end) lastEnded = p;
  }
  // Is there a next phase that has started? If yes, use that rule instead.
  const afterLast = lastEnded
    ? phases.slice(phases.indexOf(lastEnded) + 1).find(p => p.start && today >= p.start)
    : null;

  if (lastEnded && !afterLast) {
    // 마지막이 끝났고 그 뒤 단계가 시작 안 됨
    const isLastPhase = phases.indexOf(lastEnded) === phases.length - 1;
    if (isLastPhase) {
      return { state: 'completed', phase: lastEnded };
    }
    const daysOver = Math.round((today - lastEnded.end) / 86400000);
    return { state: 'overdue', phase: lastEnded, daysOver };
  }

  // 아직 시작도 안 됨 (가장 빠른 start가 오늘 이후)
  const upcoming = phases.filter(p => p.start && p.start > today).sort((a, b) => a.start - b.start)[0];
  if (upcoming) {
    const daysUntil = Math.round((upcoming.start - today) / 86400000);
    return { state: 'upcoming', phase: upcoming, daysUntil };
  }

  return { state: 'empty' };
};

const PhaseTimeline = ({ project }) => {
  const phases = useMemo(() => PHASES.map(p => {
    const start = toDate(project[`${p.key}_start`]);
    const end = toDate(project[`${p.key}_end`]);
    return { ...p, start, end };
  }), [project]);

  // 전체 범위 계산
  const { minDate, maxDate, totalMs } = useMemo(() => {
    const dates = [];
    phases.forEach(p => {
      if (p.start) dates.push(p.start);
      if (p.end) dates.push(p.end);
    });
    if (dates.length === 0) return { minDate: null, maxDate: null, totalMs: 0 };
    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));
    return { minDate: min, maxDate: max, totalMs: Math.max(1, max - min) };
  }, [phases]);

  const anySet = phases.some(p => p.start || p.end);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!anySet) {
    return (
      <div className="phase-timeline-empty">
        아직 단계별 일정이 설정되지 않았어요. <br/>
        <span style={{ opacity: 0.5 }}>프로젝트 편집 화면에서 기획/디자인/개발/테스트 일자를 입력해주세요.</span>
      </div>
    );
  }

  // 오늘 위치 (%)
  const todayOffset = minDate && maxDate && today >= minDate && today <= maxDate
    ? ((today - minDate) / totalMs) * 100
    : null;

  const overallStatus = getProjectPhaseStatus(project);
  const overduePhaseKey = overallStatus.state === 'overdue' ? overallStatus.phase.key : null;

  const getPhaseStatus = (p) => {
    if (!p.start || !p.end) return 'pending';
    if (today < p.start) return 'upcoming';
    if (today > p.end) {
      return p.key === overduePhaseKey ? 'overdue' : 'done';
    }
    return 'active';
  };

  return (
    <div className="phase-timeline">
      {/* 범위 헤더 */}
      <div className="phase-timeline-range">
        <span>{fmt(minDate)}</span>
        <span className="phase-range-total">
          총 {Math.max(1, Math.round(totalMs / 86400000))}일
        </span>
        <span>{fmt(maxDate)}</span>
      </div>

      {/* 타임라인 바 */}
      <div className="phase-timeline-track-wrap">
        {todayOffset !== null && (
          <div className="phase-timeline-today" style={{ left: `${todayOffset}%` }} title={`오늘: ${fmtFull(today)}`}>
            <span>오늘</span>
          </div>
        )}
        {phases.map((p) => {
          const status = getPhaseStatus(p);
          const hasRange = p.start && p.end && minDate && maxDate;
          const offsetPct = hasRange ? ((p.start - minDate) / totalMs) * 100 : 0;
          const widthPct = hasRange ? Math.max(3, ((p.end - p.start) / totalMs) * 100) : 0;

          return (
            <div key={p.key} className="phase-timeline-row">
              <div className="phase-timeline-label">
                <span style={{ color: p.color }}>{p.emoji} {p.label}</span>
                <span className={`phase-status-chip status-${status}`}>
                  {status === 'active' && '진행 중'}
                  {status === 'overdue' && '⚠️ 지연'}
                  {status === 'done' && '완료'}
                  {status === 'upcoming' && '예정'}
                  {status === 'pending' && '미설정'}
                </span>
              </div>
              <div className="phase-timeline-track">
                {hasRange ? (
                  <motion.div
                    initial={{ scaleX: 0, originX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="phase-timeline-bar"
                    style={{
                      left: `${offsetPct}%`,
                      width: `${widthPct}%`,
                      background: `linear-gradient(90deg, ${p.color}, ${p.color}cc)`,
                      opacity: status === 'done' ? 0.55 : 1,
                    }}
                    title={`${fmtFull(p.start)} ~ ${fmtFull(p.end)}`}
                  >
                    <span className="phase-bar-dates">
                      {fmt(p.start)} ~ {fmt(p.end)}
                    </span>
                  </motion.div>
                ) : (
                  <div className="phase-timeline-unset">
                    {p.start ? `시작: ${fmt(p.start)}` : p.end ? `마감: ${fmt(p.end)}` : '일정 미설정'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PhaseTimeline;
