import { FileItem } from '../types';

export const createFileItem = (file: File): FileItem => {
  const parts = file.name.split('.');
  const ext = parts.length > 1 ? parts.pop()! : '';
  const name = parts.join('.');

  return {
    id: crypto.randomUUID?.() || Math.random().toString(36).substring(2, 11),
    file,
    originalName: name,
    originalExt: ext,
    newName: name,
    newExt: ext,
    path: (file as any).webkitRelativePath || ''
  };
};

export const createFileItems = (fileList: FileList | File[]): FileItem[] => {
  return Array.from(fileList).map(createFileItem);
};
