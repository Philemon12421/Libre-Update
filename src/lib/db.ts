import Dexie, { type Table } from 'dexie';

export interface LibreFile {
  id?: number;
  name: string;
  type: string;
  size: number;
  data: Blob;
  folderId?: number;
  createdAt: number;
}

export interface LibreFolder {
  id?: number;
  name: string;
  createdAt: number;
  color?: string;
}

export class LibreDatabase extends Dexie {
  files!: Table<LibreFile>;
  folders!: Table<LibreFolder>;

  constructor() {
    super('LibreDatabase');
    this.version(1).stores({
      files: '++id, name, type, folderId, createdAt',
      folders: '++id, name, createdAt'
    });
  }
}

export const db = new LibreDatabase();
