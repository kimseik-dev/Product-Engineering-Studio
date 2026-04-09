import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, ChevronLeft, Check, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import CustomEditor from './CustomEditor';

const WritingPage = ({ editData, onClose, onSaveSuccess, categories = [] }) => {
  const [title, setTitle] = useState(editData?.title || '');
  const [content, setContent] = useState(editData?.content || '');
  const [categoryId, setCategoryId] = useState(editData?.category_id || (categories && categories.length > 0 ? categories[0].id : null));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleSave = async () => {
    if (!title.trim() || !content.trim() || !categoryId) {
      toast.error('제목, 내용, 카테고리를 모두 확인해주세요! ✨');
      return;
    }

    try {
      setIsSubmitting(true);
      const postData = {
        title,
        content,
        category_id: categoryId,
        updated_at: new Date().toISOString(),
      };

      if (editData?.id) {
        const { error } = await supabase
          .from('posts')
          .update(postData)
          .eq('id', editData.id);
        if (error) throw error;
        toast.success('게시글이 수정되었습니다! 🌈');
      } else {
        const { error } = await supabase
          .from('posts')
          .insert([{ ...postData, created_at: new Date().toISOString() }]);
        if (error) throw error;
        toast.success('새로운 영감이 성공적으로 등록되었습니다! 🚀');
      }

      setIsSuccess(true);
      setTimeout(() => {
        onSaveSuccess();
      }, 1500);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('저장 중 오류가 발생했습니다. 😢');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      className="writing-page-premium"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="writing-bg-glow-premium"></div>
      
      {/* Header */}
      <header className="writing-premium-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
          <button className="exit-btn-premium" onClick={onClose}>
            <ChevronLeft size={22} />
            <span>돌아가기</span>
          </button>
          
          <div className="category-chips-container">
            {categories.map(cat => (
              <button 
                key={cat.id}
                className={`category-chip-premium ${String(categoryId) === String(cat.id) ? 'active' : ''}`}
                onClick={() => setCategoryId(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="writing-actions">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="publish-btn-premium" 
            onClick={handleSave}
            disabled={isSubmitting || isSuccess}
          >
            {isSuccess ? (
              <>
                <span>완료됨</span>
                <Check size={18} />
              </>
            ) : isSubmitting ? (
              <span>등록 중...</span>
            ) : (
              <>
                <span>발행하기</span>
                <ArrowRight size={18} />
              </>
            )}
          </motion.button>
        </div>
      </header>

      {/* Main Content */}
      <main className="writing-main custom-scrollbar">
        <motion.div 
          className="writing-center-column"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {/* Title Area */}
          <div className="title-section">
            <textarea
              className="title-textarea"
              placeholder="멋진 제목으로 시작해볼까요?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              rows={1}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
            />
            <motion.div 
              className="title-underline"
              initial={{ width: 0 }}
              animate={{ width: title.length > 0 ? '100px' : '60px' }}
              transition={{ duration: 0.5 }}
            />
          </div>

          <div className="writing-info-bar">
            <span className="info-item">
              <Sparkles size={16} className="text-primary" /> 
              프리미엄 지식 공유 모드
            </span>
            <span className="info-divider"></span>
            <span className="info-item">대표님의 인사이트가 큰 힘이 됩니다 ✨</span>
          </div>

          <div className="editor-container" style={{ border: 'none' }}>
            <CustomEditor 
              value={content} 
              onChange={setContent}
              placeholder="대표님의 소중한 경험과 지식을 자유롭게 기록해주세요..."
            />
          </div>
        </motion.div>
      </main>

      {/* Success Overlay */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(15, 23, 42, 0.9)',
              backdropFilter: 'blur(10px)',
              zIndex: 3000,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px'
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: 360 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: 'var(--success-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 0 50px rgba(16, 185, 129, 0.5)'
              }}
            >
              <Check size={50} strokeWidth={4} />
            </motion.div>
            <h2 style={{ fontSize: '32px', fontWeight: 800, color: 'white' }}>등록 완료! ✨</h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '18px' }}>지식 창고에 안전하게 보관되었습니다.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default WritingPage;

