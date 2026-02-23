/**
 * HTML Document Editor
 *
 * Simple contenteditable-based editor that preserves all HTML formatting
 * from Pandoc conversion. No complex editor library - just native HTML rendering.
 */

import { useRef, useCallback, useImperativeHandle, forwardRef, useEffect } from 'react';
import DOMPurify from 'dompurify';
import './HtmlEditor.css';

export interface HtmlEditorRef {
  getHTML: () => string;
  setContent: (content: string) => void;
  findAndSelect: (text: string) => boolean;
}

export interface HtmlEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  className?: string;
  readOnly?: boolean;
}

export const HtmlEditor = forwardRef<HtmlEditorRef, HtmlEditorProps>(
  (
    {
      initialContent = '<p>Loading document...</p>',
      onChange,
      className = '',
      readOnly = false,
    },
    ref
  ) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const lastContentRef = useRef<string>(initialContent);

    // Sanitize HTML while preserving all formatting
    const sanitizeHtml = useCallback((html: string) => {
      return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          'p', 'br', 'span', 'div',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'strong', 'b', 'em', 'i', 'u', 's', 'strike',
          'sup', 'sub',
          'ul', 'ol', 'li',
          'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
          'img', 'figure', 'figcaption',
          'a', 'blockquote', 'pre', 'code',
          'hr',
        ],
        ALLOWED_ATTR: [
          'class', 'id', 'style',
          'href', 'target', 'rel',
          'src', 'alt', 'title', 'width', 'height',
          'colspan', 'rowspan', 'scope',
          'data-*',
        ],
        ALLOW_DATA_ATTR: true,
      });
    }, []);

    // Set initial content
    useEffect(() => {
      if (editorRef.current && initialContent) {
        const sanitized = sanitizeHtml(initialContent);
        editorRef.current.innerHTML = sanitized;
        lastContentRef.current = sanitized;
      }
    }, [initialContent, sanitizeHtml]);

    // Handle content changes
    const handleInput = useCallback(() => {
      if (editorRef.current) {
        const html = editorRef.current.innerHTML;
        if (html !== lastContentRef.current) {
          lastContentRef.current = html;
          onChange?.(html);
        }
      }
    }, [onChange]);

    // Find and select text
    const findAndSelect = useCallback((searchText: string): boolean => {
      if (!editorRef.current || !window.getSelection) return false;

      const selection = window.getSelection();
      if (!selection) return false;

      // Search through text nodes
      const walker = document.createTreeWalker(
        editorRef.current,
        NodeFilter.SHOW_TEXT,
        null
      );

      let node: Node | null;
      while ((node = walker.nextNode())) {
        const text = node.textContent || '';
        const index = text.indexOf(searchText);
        if (index !== -1) {
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + searchText.length);

          selection.removeAllRanges();
          selection.addRange(range);

          // Scroll into view
          const element = node.parentElement;
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Highlight temporarily
            const originalBg = element.style.backgroundColor;
            element.style.backgroundColor = '#fef08a';
            setTimeout(() => {
              element.style.backgroundColor = originalBg;
            }, 2000);
          }

          return true;
        }
      }

      return false;
    }, []);

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        getHTML: () => editorRef.current?.innerHTML || '',
        setContent: (content: string) => {
          if (editorRef.current) {
            const sanitized = sanitizeHtml(content);
            editorRef.current.innerHTML = sanitized;
            lastContentRef.current = sanitized;
          }
        },
        findAndSelect,
      }),
      [sanitizeHtml, findAndSelect]
    );

    return (
      <div className={`html-editor-container ${className}`}>
        {/* Toolbar */}
        <div className="html-editor-toolbar">
          <div className="toolbar-group">
            <button
              onClick={() => document.execCommand('bold')}
              title="Bold (Ctrl+B)"
            >
              <strong>B</strong>
            </button>
            <button
              onClick={() => document.execCommand('italic')}
              title="Italic (Ctrl+I)"
            >
              <em>I</em>
            </button>
            <button
              onClick={() => document.execCommand('underline')}
              title="Underline (Ctrl+U)"
            >
              <u>U</u>
            </button>
            <button
              onClick={() => document.execCommand('strikeThrough')}
              title="Strikethrough"
            >
              <s>S</s>
            </button>
          </div>

          <div className="toolbar-divider" />

          <div className="toolbar-group">
            <button
              onClick={() => document.execCommand('superscript')}
              title="Superscript"
            >
              X<sup>2</sup>
            </button>
            <button
              onClick={() => document.execCommand('subscript')}
              title="Subscript"
            >
              X<sub>2</sub>
            </button>
          </div>

          <div className="toolbar-divider" />

          <div className="toolbar-group">
            <button
              onClick={() => document.execCommand('insertUnorderedList')}
              title="Bullet List"
            >
              • List
            </button>
            <button
              onClick={() => document.execCommand('insertOrderedList')}
              title="Numbered List"
            >
              1. List
            </button>
          </div>

          <div className="toolbar-divider" />

          <div className="toolbar-group">
            <button
              onClick={() => document.execCommand('undo')}
              title="Undo (Ctrl+Z)"
            >
              ↶
            </button>
            <button
              onClick={() => document.execCommand('redo')}
              title="Redo (Ctrl+Y)"
            >
              ↷
            </button>
          </div>
        </div>

        {/* Editor Content */}
        <div
          ref={editorRef}
          className="html-editor-content"
          contentEditable={!readOnly}
          onInput={handleInput}
          suppressContentEditableWarning
        />

        {/* Status Bar */}
        <div className="html-editor-statusbar">
          <span>
            {readOnly ? 'Read Only' : 'Editing'}
          </span>
        </div>
      </div>
    );
  }
);

HtmlEditor.displayName = 'HtmlEditor';

export default HtmlEditor;
