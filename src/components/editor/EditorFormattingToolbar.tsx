/**
 * EditorFormattingToolbar Component
 *
 * Provides text formatting controls: bold, italic, underline, strikethrough,
 * superscript, subscript, headings, lists, and undo/redo.
 */

import type { Editor } from '@tiptap/react';

interface EditorFormattingToolbarProps {
  editor: Editor;
}

const btnBase =
  'flex items-center justify-center min-w-[32px] h-8 px-2 border-none rounded bg-transparent text-slate-600 text-sm cursor-pointer transition-all duration-150 hover:bg-slate-200 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed';
const btnActive = 'bg-blue-500 text-white hover:bg-blue-500 hover:text-white';

function tbBtn(isActive: boolean): string {
  return isActive ? `${btnBase} ${btnActive}` : btnBase;
}

export function EditorFormattingToolbar({ editor }: EditorFormattingToolbarProps) {
  return (
    <>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={tbBtn(editor.isActive('bold'))}
          title="Bold (Ctrl+B)"
          aria-label="Bold"
          aria-pressed={editor.isActive('bold')}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={tbBtn(editor.isActive('italic'))}
          title="Italic (Ctrl+I)"
          aria-label="Italic"
          aria-pressed={editor.isActive('italic')}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={tbBtn(editor.isActive('underline'))}
          title="Underline (Ctrl+U)"
          aria-label="Underline"
          aria-pressed={editor.isActive('underline')}
        >
          <u>U</u>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={tbBtn(editor.isActive('strike'))}
          title="Strikethrough"
          aria-label="Strikethrough"
          aria-pressed={editor.isActive('strike')}
        >
          <s>S</s>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          className={tbBtn(editor.isActive('superscript'))}
          title="Superscript"
          aria-label="Superscript"
          aria-pressed={editor.isActive('superscript')}
        >
          X<sup>2</sup>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          className={tbBtn(editor.isActive('subscript'))}
          title="Subscript"
          aria-label="Subscript"
          aria-pressed={editor.isActive('subscript')}
        >
          X<sub>2</sub>
        </button>
      </div>

      <div className="w-px h-6 bg-slate-200 mx-2" />

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={tbBtn(editor.isActive('heading', { level: 1 }))}
          title="Heading 1"
          aria-label="Heading level 1"
          aria-pressed={editor.isActive('heading', { level: 1 })}
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={tbBtn(editor.isActive('heading', { level: 2 }))}
          title="Heading 2"
          aria-label="Heading level 2"
          aria-pressed={editor.isActive('heading', { level: 2 })}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={tbBtn(editor.isActive('heading', { level: 3 }))}
          title="Heading 3"
          aria-label="Heading level 3"
          aria-pressed={editor.isActive('heading', { level: 3 })}
        >
          H3
        </button>
      </div>

      <div className="w-px h-6 bg-slate-200 mx-2" />

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={tbBtn(editor.isActive('bulletList'))}
          title="Bullet List"
          aria-label="Bullet list"
          aria-pressed={editor.isActive('bulletList')}
        >
          {'\u2022'} List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={tbBtn(editor.isActive('orderedList'))}
          title="Numbered List"
          aria-label="Numbered list"
          aria-pressed={editor.isActive('orderedList')}
        >
          1. List
        </button>
      </div>

      <div className="w-px h-6 bg-slate-200 mx-2" />

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className={btnBase}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          {'\u21B6'}
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className={btnBase}
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
        >
          {'\u21B7'}
        </button>
      </div>

      <div className="w-px h-6 bg-slate-200 mx-2" />
    </>
  );
}
