import { FileItem } from '../types';
import { getFullNewName } from '../logic/renamingLogic';

export const getDuplicateNames = (files: FileItem[]): Set<string> => {
  const counts = new Map<string, number>();

  files.forEach(f => {
    const name = getFullNewName(f);
    counts.set(name, (counts.get(name) || 0) + 1);
  });

  const duplicates = new Set<string>();
  counts.forEach((count, name) => {
    if (count > 1) duplicates.add(name);
  });

  return duplicates;
};
