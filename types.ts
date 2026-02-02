
export interface FileItem {
  id: string;
  file: File;
  originalName: string;
  originalExt: string;
  newName: string;
  newExt: string;
  path?: string;
}

export type RenameAction =
  | 'REPLACE'
  | 'PREFIX'
  | 'SUFFIX'
  | 'CLEAR_NAME'
  | 'CLEAR_POS'
  | 'CLEAR_BRACKETS'
  | 'REMOVE_NUMBERS'
  | 'NUMBERS_ONLY'
  | 'PADDING'
  | 'NUMBERING'
  | 'RANDOM'
  | 'EXT_DELETE'
  | 'EXT_ADD'
  | 'EXT_CHANGE';

export interface RenameParams {
  search?: string;
  replace?: string;
  text?: string;
  start?: number;
  digits?: number;
  increment?: number;
  index?: number;
}
