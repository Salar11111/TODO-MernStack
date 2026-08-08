import { Modal } from './ui/Modal';

const SHORTCUTS = [
  { keys: ['1'], description: 'Go to Tasks (list view)' },
  { keys: ['2'], description: 'Go to Board (Kanban)' },
  { keys: ['3'], description: 'Go to Calendar' },
  { keys: ['4'], description: 'Go to Stats' },
  { keys: ['N'], description: 'Focus the new-task input' },
  { keys: ['Esc'], description: 'Close dialogs / cancel editing' },
  { keys: ['?'], description: 'Show this help' },
];

function Key({ children }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.75rem] h-7 px-2 text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded shadow-sm">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsHelp({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard Shortcuts">
      <ul className="space-y-2">
        {SHORTCUTS.map((s) => (
          <li key={s.keys.join('')} className="flex items-center justify-between gap-4 py-1">
            <span className="text-sm text-gray-700 dark:text-gray-300">{s.description}</span>
            <span className="flex gap-1">
              {s.keys.map((k) => (
                <Key key={k}>{k}</Key>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
        Shortcuts are disabled while typing in input fields.
      </p>
    </Modal>
  );
}

export default KeyboardShortcutsHelp;
