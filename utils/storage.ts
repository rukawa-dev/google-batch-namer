import { FileItem } from '../types';

export interface SerializableFileItem {
  id: string;
  originalName: string;
  originalExt: string;
  newName: string;
  newExt: string;
  path?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

export const serializeFileItem = (item: FileItem): SerializableFileItem => ({
  id: item.id,
  originalName: item.originalName,
  originalExt: item.originalExt,
  newName: item.newName,
  newExt: item.newExt,
  path: item.path,
  fileName: item.file.name,
  fileSize: item.file.size,
  fileType: item.file.type,
});

export const deserializeFileItem = (item: SerializableFileItem): FileItem | null => {
  try {
    const dummyFile = new File([], item.fileName, { type: item.fileType });
    Object.defineProperty(dummyFile, 'size', { value: item.fileSize });

    return {
      id: item.id,
      file: dummyFile,
      originalName: item.originalName,
      originalExt: item.originalExt,
      newName: item.newName,
      newExt: item.newExt,
      path: item.path,
    };
  } catch (e) {
    console.error('Failed to deserialize file item:', e);
    return null;
  }
};
