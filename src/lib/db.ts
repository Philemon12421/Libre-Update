import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LibreFile {
  id: number;
  name: string;
  type: string;
  size: number;
  data: string; // Store as base64 or URI in RN
  folderId?: number;
  createdAt: number;
}

export interface LibreFolder {
  id: number;
  name: string;
  createdAt: number;
  color?: string;
}

class TableMock<T extends { id?: number }> {
  name: string;
  constructor(name: string) { this.name = name; }

  async toArray(): Promise<T[]> {
    try {
      const data = await AsyncStorage.getItem(this.name);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  }

  async add(item: T): Promise<number> {
    const items = await this.toArray();
    const id = items.length > 0 ? Math.max(...items.map(i => i.id || 0)) + 1 : 1;
    const newItem = { ...item, id };
    await AsyncStorage.setItem(this.name, JSON.stringify([...items, newItem]));
    return id;
  }

  async put(item: T): Promise<number> {
    if (!item.id) return this.add(item);
    const items = await this.toArray();
    const index = items.findIndex(i => i.id === item.id);
    if (index === -1) return this.add(item);
    items[index] = item;
    await AsyncStorage.setItem(this.name, JSON.stringify(items));
    return item.id;
  }

  async delete(id: number): Promise<void> {
    const items = await this.toArray();
    await AsyncStorage.setItem(this.name, JSON.stringify(items.filter(i => i.id !== id)));
  }

  async update(id: number, changes: Partial<T>): Promise<number> {
    const items = await this.toArray();
    const index = items.findIndex(i => i.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...changes };
      await AsyncStorage.setItem(this.name, JSON.stringify(items));
    }
    return 1;
  }

  // Basic where mock
  where(key: string) {
    return {
      equals: (value: any) => ({
        toArray: async () => {
          const items = await this.toArray();
          return items.filter((i: any) => i[key] === value);
        },
        sortBy: async (sortKey: string) => {
          const items = await this.toArray();
          return items
            .filter((i: any) => i[key] === value)
            .sort((a: any, b: any) => a[sortKey] - b[sortKey]);
        },
        count: async () => {
          const items = await this.toArray();
          return items.filter((i: any) => i[key] === value).length;
        }
      })
    };
  }

  orderBy(key: string) {
    return {
      reverse: () => ({
        toArray: async () => {
          const items = await this.toArray();
          return items.sort((a: any, b: any) => b[key] - a[key]);
        }
      })
    };
  }
}

export const db = {
  files: new TableMock<LibreFile>('files'),
  folders: new TableMock<LibreFolder>('folders')
};
