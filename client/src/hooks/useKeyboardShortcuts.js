import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Global keyboard shortcuts. Pass an object of action callbacks.
 * Shortcuts are ignored while typing in inputs, textareas, or contenteditable
 * elements (except for Escape, which is always allowed).
 *
 * Defaults:
 *  - 1 → Tasks (list view)
 *  - 2 → Board (kanban)
 *  - 3 → Calendar
 *  - 4 → Stats
 *  - N → Focus the new-task input
 *  - ? → Show the shortcuts help modal
 *  - Esc → close overlays (delegated to a callback)
 */
export function useKeyboardShortcuts({ onFocusNewTask, onShowHelp, onEscape } = {}) {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      const target = e.target;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      // Escape is always allowed, even while typing
      if (e.key === 'Escape') {
        onEscape?.();
        return;
      }

      // Ignore other shortcuts while typing or with modifier keys
      if (isTyping || e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case '1':
          navigate('/');
          break;
        case '2':
          navigate('/kanban');
          break;
        case '3':
          navigate('/calendar');
          break;
        case '4':
          navigate('/stats');
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          onFocusNewTask?.();
          break;
        case '?':
          e.preventDefault();
          onShowHelp?.();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, onFocusNewTask, onShowHelp, onEscape]);
}
