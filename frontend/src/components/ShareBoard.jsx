import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Plus, Trash2, User, Search, Calendar, Database, AlertCircle, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ShareBoard = ({ members = [], onOpenWriter, categories = [] }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [dbError, setDbError] = useState(false);
  
  useEffect(() => {
    fetchPosts();
    
    const postsChannel = supabase.channel('posts_sync_v4')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => fetchPosts())
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
    };
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('posts')
        .select('*, author:members(*), category:post_categories(*)')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          setDbError(true);
          setPosts([]);
          return;
        }
        throw error;
      }
      setDbError(false);
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => onOpenWriter(null);
  const openEditModal = (post, e) => {
    e?.stopPropagation();
    onOpenWriter(post);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('추억(?)이 담긴 정보를 삭제하시겠어요? 🥺')) return;
    try {
      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (error) throw error;
      toast.success('삭제 완료!');
      fetchPosts();
    } catch (error) {
      toast.error(`삭제 오류: ${error.message}`);
    }
  };

  const filteredPosts = useMemo(() => {
    return posts.filter(p => {
      const categoryMatch = selectedCategoryId === 'All' || String(p.category_id) === String(selectedCategoryId);
      const searchMatch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.content && p.content.toLowerCase().includes(searchQuery.toLowerCase()));
      return categoryMatch && searchMatch;
    });
  }, [posts, selectedCategoryId, searchQuery]);

  return (
    <div className="insight-container-premium">
      {/* Header Section */}
      <div className="insight-header-premium">
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
            <Sparkles className="text-primary" size={32} /> 인사이트 창고
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px' }}>대표님들의 소중한 지식과 경험이 쌓이는 공간입니다 ✨</p>
        </div>
        
        {!dbError && (
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="action-btn primary" 
            onClick={openCreateModal}
            style={{ padding: '14px 28px', borderRadius: '16px' }}
          >
            <Plus size={20} /> 지식 공유하기
          </motion.button>
        )}
      </div>

      {/* Filter & Search Section */}
      <div className="insight-header-premium">
        <div className="premium-filter-tabs">
          <button 
            className={`filter-tab ${selectedCategoryId === 'All' ? 'active' : ''}`}
            onClick={() => setSelectedCategoryId('All')}
          >
            전체
          </button>
          {categories.map((cat) => (
            <button 
              key={cat.id} 
              className={`filter-tab ${String(selectedCategoryId) === String(cat.id) ? 'active' : ''}`}
              onClick={() => setSelectedCategoryId(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="search-box-premium">
          <Search className="search-icon-premium" size={20} />
          <input 
            type="text" 
            placeholder="제목이나 내용으로 검색..." 
            className="search-input-premium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Main Content Area */}
      {dbError ? (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          className="glass" 
          style={{ padding: '60px', textAlign: 'center', borderRadius: '32px', border: '1px solid rgba(99, 102, 241, 0.2)', background: 'rgba(99, 102, 241, 0.02)' }}
        >
          <Database size={64} className="text-primary" style={{ marginBottom: '24px', opacity: 0.8 }} />
          <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '16px' }}>데이터베이스 연결이 필요해요! 💡</h3>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '32px', maxWidth: '550px', margin: '0 auto 32px', lineHeight: 1.6 }}>
            인사이트를 저장할 <b>posts</b> 테이블을 찾을 수 없습니다.<br/>
            영자가 마련해둔 SQL 스크립트를 실행해서 창고를 완성해주세요!
          </p>
          <div style={{ padding: '24px', background: 'rgba(0,0,0,0.3)', borderRadius: '16px', textAlign: 'left', fontFamily: 'monospace', fontSize: '13px', color: '#818cf8', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto' }}>
            CREATE TABLE public.posts (<br/>
            &nbsp;&nbsp;id bigint generated by default as identity primary key,<br/>
            &nbsp;&nbsp;title text not null,<br/>
            &nbsp;&nbsp;content text,<br/>
            &nbsp;&nbsp;category_id bigint references post_categories(id),<br/>
            &nbsp;&nbsp;author_id bigint references members(id),<br/>
            &nbsp;&nbsp;created_at timestamp with time zone default now()<br/>
            );
          </div>
        </motion.div>
      ) : (
        <div style={{ minHeight: '400px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', gap: '20px' }}>
              <div className="loading-spinner" />
              <p style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>아름다운 지식들을 정렬하고 있어요...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass" 
              style={{ padding: '100px 40px', textAlign: 'center', borderRadius: '32px', border: '1px dashed rgba(255,255,255,0.1)' }}
            >
              <AlertCircle size={56} style={{ opacity: 0.1, marginBottom: '24px', color: 'white' }} />
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '20px', fontWeight: 600 }}>
                {searchQuery ? `'${searchQuery}'에 대한 결과를 찾지 못했어요 😢` : '아직 공유된 지식이 없네요. 첫 페이지를 장식해주세요! 💖'}
              </p>
            </motion.div>
          ) : (
            <div className="insight-masonry">
              <AnimatePresence mode='popLayout'>
                {filteredPosts.map((post, idx) => (
                  <motion.div
                    key={post.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 260, 
                      damping: 20,
                      delay: idx * 0.03
                    }}
                    className="insight-card-premium"
                    onClick={(e) => openEditModal(post, e)}
                  >
                    <div className="card-shine" />
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <span 
                        className="category-badge-premium" 
                        style={{ 
                          backgroundColor: `${post.category?.color || '#6366f1'}20`, 
                          color: post.category?.color || '#818cf8',
                          borderColor: `${post.category?.color || '#6366f1'}40`
                        }}
                      >
                        {post.category?.label || '일반'}
                      </span>
                      <motion.button 
                        whileHover={{ scale: 1.1, color: '#ef4444' }}
                        className="icon-btn xs" 
                        style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.2)' }}
                        onClick={(e) => handleDelete(post.id, e)}
                      >
                        <Trash2 size={15} />
                      </motion.button>
                    </div>
                    
                    <h3 className="insight-title-premium">{post.title}</h3>
                    
                    <div 
                      className="insight-content-preview"
                      dangerouslySetInnerHTML={{ __html: post.content }}
                    />
                    
                    <div className="insight-footer-premium">
                      <div className="author-info-premium">
                        <div className="author-avatar-small">
                          {post.author?.avatar ? (
                            <img src={post.author.avatar} alt={post.author.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : (
                            <User size={14} />
                          )}
                        </div>
                        <span className="author-name-premium">{post.author?.name || '대표님'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={12} className="date-text-premium" />
                        <span className="date-text-premium">
                          {new Date(post.created_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ShareBoard;

