import { useEffect, useRef } from 'react';
import { FileItem } from '../types';
import { STORAGE_KEY } from '../constants';
import { SerializableFileItem, serializeFileItem, deserializeFileItem } from '../utils/storage';

export const useLocalStorage = (
  files: FileItem[],
  history: FileItem[][],
  redoStack: FileItem[][],
  setFiles: (files: FileItem[]) => void,
  setHistory: (history: FileItem[][]) => void,
  setRedoStack: (redoStack: FileItem[][]) => void
) => {
  const isInitialMount = useRef(true);

  // 초기 로드 시 localStorage에서 상태 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { files: savedFiles, history: savedHistory, redoStack: savedRedoStack } = JSON.parse(saved);

        if (savedFiles && Array.isArray(savedFiles)) {
          const restoredFiles = savedFiles
            .map((item: SerializableFileItem) => deserializeFileItem(item))
            .filter((item): item is FileItem => item !== null);
          setFiles(restoredFiles);
        }

        if (savedHistory && Array.isArray(savedHistory)) {
          const restoredHistory = savedHistory
            .map((historyItems: SerializableFileItem[]) =>
              historyItems
                .map(item => deserializeFileItem(item))
                .filter((item): item is FileItem => item !== null)
            )
            .filter((items: FileItem[]) => items.length > 0);
          setHistory(restoredHistory);
        }

        if (savedRedoStack && Array.isArray(savedRedoStack)) {
          const restoredRedoStack = savedRedoStack
            .map((redoItems: SerializableFileItem[]) =>
              redoItems
                .map(item => deserializeFileItem(item))
                .filter((item): item is FileItem => item !== null)
            )
            .filter((items: FileItem[]) => items.length > 0);
          setRedoStack(restoredRedoStack);
        }
      }
    } catch (e) {
      console.error('Failed to restore state from localStorage:', e);
    }

    setTimeout(() => {
      isInitialMount.current = false;
    }, 100);
  }, []);

  // 상태 변경 시 localStorage에 저장
  useEffect(() => {
    if (isInitialMount.current) return;

    try {
      const stateToSave = {
        files: files.map(serializeFileItem),
        history: history.map(items => items.map(serializeFileItem)),
        redoStack: redoStack.map(items => items.map(serializeFileItem)),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Failed to save state to localStorage:', e);
    }
  }, [files, history, redoStack]);
};
