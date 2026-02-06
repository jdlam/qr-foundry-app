import type {
  HistoryAdapter,
  HistoryItem,
  HistoryListResult,
  NewHistoryItem,
  TemplateAdapter,
  Template,
  NewTemplate,
} from '../types';

const HISTORY_KEY = 'qr-foundry-history';
const TEMPLATES_KEY = 'qr-foundry-templates';

function getStoredItems<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setStoredItems<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

function nextId(items: { id: number }[]): number {
  return items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
}

export const historyAdapter: HistoryAdapter = {
  async list(limit: number, offset: number, search: string | null): Promise<HistoryListResult> {
    let items = getStoredItems<HistoryItem>(HISTORY_KEY);

    // Sort by creation date descending (newest first)
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.content.toLowerCase().includes(q) ||
          i.qrType.toLowerCase().includes(q) ||
          (i.label && i.label.toLowerCase().includes(q))
      );
    }

    const total = items.length;
    const sliced = items.slice(offset, offset + limit);

    return {
      items: sliced,
      total,
      hasMore: offset + limit < total,
    };
  },

  async save(item: NewHistoryItem): Promise<number> {
    const items = getStoredItems<HistoryItem>(HISTORY_KEY);
    const now = new Date().toISOString();
    const newItem: HistoryItem = {
      id: nextId(items),
      content: item.content,
      qrType: item.qrType,
      label: item.label || null,
      styleJson: item.styleJson,
      thumbnail: item.thumbnail || null,
      createdAt: now,
      updatedAt: now,
    };
    items.push(newItem);
    setStoredItems(HISTORY_KEY, items);
    return newItem.id;
  },

  async delete(id: number): Promise<boolean> {
    const items = getStoredItems<HistoryItem>(HISTORY_KEY);
    const filtered = items.filter((i) => i.id !== id);
    if (filtered.length === items.length) return false;
    setStoredItems(HISTORY_KEY, filtered);
    return true;
  },

  async clear(): Promise<number> {
    const items = getStoredItems<HistoryItem>(HISTORY_KEY);
    const count = items.length;
    localStorage.removeItem(HISTORY_KEY);
    return count;
  },
};

export const templateAdapter: TemplateAdapter = {
  async list(): Promise<Template[]> {
    const items = getStoredItems<Template>(TEMPLATES_KEY);
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
  },

  async get(id: number): Promise<Template | null> {
    const items = getStoredItems<Template>(TEMPLATES_KEY);
    return items.find((t) => t.id === id) || null;
  },

  async save(template: NewTemplate): Promise<number> {
    const items = getStoredItems<Template>(TEMPLATES_KEY);
    const newItem: Template = {
      id: nextId(items),
      name: template.name,
      styleJson: template.styleJson,
      preview: template.preview || null,
      isDefault: template.isDefault || false,
      createdAt: new Date().toISOString(),
    };
    items.push(newItem);
    setStoredItems(TEMPLATES_KEY, items);
    return newItem.id;
  },

  async update(id: number, template: NewTemplate): Promise<boolean> {
    const items = getStoredItems<Template>(TEMPLATES_KEY);
    const index = items.findIndex((t) => t.id === id);
    if (index === -1) return false;
    items[index] = {
      ...items[index],
      name: template.name,
      styleJson: template.styleJson,
      preview: template.preview ?? items[index].preview,
      isDefault: template.isDefault ?? items[index].isDefault,
    };
    setStoredItems(TEMPLATES_KEY, items);
    return true;
  },

  async delete(id: number): Promise<boolean> {
    const items = getStoredItems<Template>(TEMPLATES_KEY);
    const filtered = items.filter((t) => t.id !== id);
    if (filtered.length === items.length) return false;
    setStoredItems(TEMPLATES_KEY, filtered);
    return true;
  },

  async setDefault(id: number): Promise<boolean> {
    const items = getStoredItems<Template>(TEMPLATES_KEY);
    const found = items.find((t) => t.id === id);
    if (!found) return false;
    for (const t of items) {
      t.isDefault = t.id === id;
    }
    setStoredItems(TEMPLATES_KEY, items);
    return true;
  },
};
