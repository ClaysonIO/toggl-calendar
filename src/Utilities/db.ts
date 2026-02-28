import Dexie, { Table } from 'dexie';

export interface TableState {
  id?: number;
  key: string;
  columnsOrder?: string[];
  columnsVisibility?: Record<string, boolean>;
  rowsOrder?: string[];
  lastUpdated: Date;
}

export class TableStateDB extends Dexie {
  tableStates!: Table<TableState>;

  constructor() {
    super('TableStateDB');
    this.version(1).stores({
      tableStates: '++id, key, lastUpdated'
    });
  }

  async getTableState(key: string): Promise<TableState | undefined> {
    return await this.tableStates.where('key').equals(key).first();
  }

  async saveTableState(state: Omit<TableState, 'id' | 'lastUpdated'>): Promise<void> {
    const existingState = await this.getTableState(state.key);
    
    if (existingState) {
      await this.tableStates.update(existingState.id!, {
        ...state,
        lastUpdated: new Date()
      });
    } else {
      await this.tableStates.add({
        ...state,
        lastUpdated: new Date()
      });
    }
  }

  async resetTableState(key: string): Promise<void> {
    await this.tableStates.where('key').equals(key).delete();
  }
}

export const db = new TableStateDB(); 