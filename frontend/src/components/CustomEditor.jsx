import React, { useRef, useEffect, useState } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Image as ImageIcon, Type } from 'lucide-react';

const CustomEditor = ({ value, onChange, placeholder }) => {
  const editorRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  // Sync initial value only once or when external value changes drastically
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      onChange(content === '<br>' ? '' : content);
    }
  };

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        execCommand('insertImage', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={`custom-editor-container ${isFocused ? 'focused' : ''}`}>
      {/* Toolbar */}
      <div className="editor-toolbar">
        <button onClick={() => execCommand('bold')} title="굵게"><Bold size={16} /></button>
        <button onClick={() => execCommand('italic')} title="기울임"><Italic size={16} /></button>
        <button onClick={() => execCommand('underline')} title="밑줄"><Underline size={16} /></button>
        <div className="toolbar-divider" />
        <button onClick={() => execCommand('insertUnorderedList')} title="글머리 기호"><List size={16} /></button>
        <button onClick={() => execCommand('insertOrderedList')} title="번호 매기기"><ListOrdered size={16} /></button>
        <div className="toolbar-divider" />
        <label className="toolbar-icon-label" title="이미지 삽입">
          <ImageIcon size={16} />
          <input type="file" accept="image/*" onChange={handleImageUpload} hidden />
        </label>
      </div>

      {/* Editable Area */}
      <div 
        ref={editorRef}
        className="editor-content custom-scrollbar"
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        style={{ 
          minHeight: '250px', 
          padding: '15px', 
          outline: 'none',
          color: '#fff',
          fontSize: '15px',
          lineHeight: '1.6'
        }}
      />

      <style>{`
        .custom-editor-container {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s;
          display: flex;
          flex-direction: column;
        }
        .custom-editor-container.focused {
          border-color: var(--primary-color);
          box-shadow: 0 0 15px rgba(99, 102, 241, 0.2);
          background: rgba(255, 255, 255, 0.05);
        }
        .editor-toolbar {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 8px;
          background: rgba(255, 255, 255, 0.05);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .editor-toolbar button, .toolbar-icon-label {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: all 0.2s;
        }
        .editor-toolbar button:hover, .toolbar-icon-label:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }
        .toolbar-divider {
          width: 1px;
          height: 20px;
          background: rgba(255, 255, 255, 0.1);
          margin: 0 5px;
        }
        .editor-content:empty:before {
          content: attr(placeholder);
          color: rgba(255, 255, 255, 0.3);
          pointer-events: none;
        }
        .editor-content img {
          max-width: 100%;
          border-radius: 8px;
          margin: 10px 0;
          box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        }
        .editor-content ul, .editor-content ol {
          padding-left: 20px;
          margin: 10px 0;
        }
      `}</style>
    </div>
  );
};

export default CustomEditor;
