declare module 'react-native-sqlite-storage' {
  export interface SQLiteDatabase {
    transaction(callback: (tx: any) => void): Promise<void>;
    executeSql(statement: string, params?: any[]): Promise<any[]>;
  }
  export function openDatabase(params: any): Promise<SQLiteDatabase>;
  export function enablePromise(enable: boolean): void;
}
