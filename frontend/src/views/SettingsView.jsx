import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Settings, Trash2 } from 'lucide-react';

const SettingsView = ({ categories, onCreate, onEdit, onDelete }) => (
  <motion.div
    className="projects-list-view"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <div className="list-header glass">
      <div className="list-title-area">
        <h2>⚙️ 환경 설정</h2>
        <p>시스템 전반의 설정을 영자와 함께 관리해보세요! ✨</p>
      </div>
    </div>

    <div className="settings-section glass mt-6" style={{ padding: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: 700 }}>📁 정보 공유 카테고리 관리</h3>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>정보 공유 게시판에서 사용할 카테고리를 추가하거나 수정할 수 있어요.</p>
        </div>
        <button className="action-btn primary" onClick={onCreate}>
          <Plus size={18} /> 새 카테고리 추가
        </button>
      </div>

      <div className="categories-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {categories.map(cat => (
          <motion.div
            key={cat.id}
            className="category-card glass"
            whileHover={{ scale: 1.02 }}
            style={{ padding: '20px', position: 'relative', borderLeft: `4px solid ${cat.color || '#6366f1'}` }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>{cat.label}</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Key: {cat.name}</div>
              </div>
              <div className="card-actions" style={{ display: 'flex', gap: '8px' }}>
                <button className="icon-btn xs" onClick={() => onEdit(cat)}><Settings size={14} /></button>
                <button className="icon-btn xs danger" onClick={() => onDelete(cat.id)}><Trash2 size={14} /></button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </motion.div>
);

export default SettingsView;
