import { fetchAllTodos } from '../services/api';

export { fetchAllTodos };

const toRow = (t) => ({
  title: t.title,
  description: t.description ?? '',
  priority: t.priority,
  isCompleted: t.isCompleted,
  dueDate: t.dueDate ? t.dueDate.slice(0, 10) : '',
  tags: (t.tags ?? []).join('; '),
  subtasks: (t.subtasks ?? []).map((s) => `${s.isCompleted ? '[x]' : '[ ]'} ${s.title}`).join('; '),
  createdAt: t.createdAt,
});

export function toCSV(todos) {
  const headers = ['title', 'description', 'priority', 'isCompleted', 'dueDate', 'tags', 'subtasks'];
  const escape = (value) => {
    const str = String(value ?? '');
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const rows = todos.map((t) => {
    const row = toRow(t);
    return headers.map((h) => escape(row[h])).join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}

export function toJSON(todos) {
  return JSON.stringify(todos.map(toRow), null, 2);
}

export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function parseImportFile(file) {
  const text = await file.text();
  const rows = [];

  if (file.name.endsWith('.json')) {
    const parsed = JSON.parse(text);
    const list = Array.isArray(parsed) ? parsed : parsed.todos;
    for (const item of list) {
      rows.push(normalizeRow(item));
    }
  } else if (file.name.endsWith('.csv')) {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    const [headerLine, ...body] = lines;
    const headers = parseCSVLine(headerLine);
    for (const line of body) {
      const values = parseCSVLine(line);
      const row = {};
      headers.forEach((h, i) => {
        row[h.trim()] = (values[i] ?? '').trim();
      });
      rows.push(normalizeRow(row));
    }
  } else {
    throw new Error('Unsupported file type. Use a .csv or .json file.');
  }

  return rows.filter((r) => r.title);
}

function normalizeRow(row) {
  const subtasks = (row.subtasks || '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const match = s.match(/^\[([ xX])\]\s*(.*)$/);
      return match
        ? { title: match[2].trim(), isCompleted: match[1].toLowerCase() === 'x' }
        : { title: s, isCompleted: false };
    });

  return {
    title: String(row.title ?? '').trim().slice(0, 100),
    description: String(row.description ?? '').trim().slice(0, 500),
    priority: ['low', 'medium', 'high'].includes(row.priority) ? row.priority : 'medium',
    isCompleted: row.isCompleted === 'true' || row.isCompleted === true,
    dueDate: /^\d{4}-\d{2}-\d{2}$/.test(row.dueDate ?? '') ? row.dueDate : undefined,
    tags: String(row.tags ?? '')
      .split(';')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10),
    subtasks,
  };
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
