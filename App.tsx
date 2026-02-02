
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { FileItem, RenameAction, RenameParams } from './types';
import { Button } from './components/Button';
import { Modal } from './components/Modal';
import { applyRenaming, getFullNewName } from './logic/renamingLogic';

// 외부 라이브러리 선언
declare const JSZip: any;

const RENAME_ACTIONS: { label: string; action: RenameAction; group: 'name' | 'ext' }[] = [
  { label: '이름 지우기', action: 'CLEAR_NAME', group: 'name' },
  { label: '문자열 바꾸기', action: 'REPLACE', group: 'name' },
  { label: '앞이름 붙이기', action: 'PREFIX', group: 'name' },
  { label: '뒷이름 붙이기', action: 'SUFFIX', group: 'name' },
  { label: '괄호안 지우기', action: 'CLEAR_BRACKETS', group: 'name' },
  { label: '숫자만 지우기', action: 'REMOVE_NUMBERS', group: 'name' },
  { label: '숫자만 남기기', action: 'NUMBERS_ONLY', group: 'name' },
  { label: '자릿수 맞추기', action: 'PADDING', group: 'name' },
  { label: '번호 붙이기', action: 'NUMBERING', group: 'name' },
  { label: '난수로 변경', action: 'RANDOM', group: 'name' },
  { label: '확장자 삭제', action: 'EXT_DELETE', group: 'ext' },
  { label: '확장자 추가', action: 'EXT_ADD', group: 'ext' },
  { label: '확장자 변경', action: 'EXT_CHANGE', group: 'ext' },
];

const STORAGE_KEY = 'landverse-batch-namer-state';

// FileItem을 저장 가능한 형태로 변환 (File 객체 제외)
interface SerializableFileItem {
  id: string;
  originalName: string;
  originalExt: string;
  newName: string;
  newExt: string;
  path?: string;
  fileName: string; // 원본 파일명 저장
  fileSize: number;
  fileType: string;
}

const serializeFileItem = (item: FileItem): SerializableFileItem => ({
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

const deserializeFileItem = (item: SerializableFileItem): FileItem | null => {
  // File 객체를 복원할 수 없으므로 더미 File 생성
  // 실제 파일 내용은 없지만 메타데이터는 유지
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

const App: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [history, setHistory] = useState<FileItem[][]>([]);
  const [redoStack, setRedoStack] = useState<FileItem[][]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
  const [currentAction, setCurrentAction] = useState<RenameAction | null>(null);
  const [params, setParams] = useState<RenameParams>({ search: '', replace: '', text: '', start: 1, digits: 2 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const isInitialMount = useRef(true);

  // 초기 로드 시 localStorage에서 상태 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      console.log('[LocalStorage] Restoring state:', saved ? 'Data found' : 'No data');

      if (saved) {
        const { files: savedFiles, history: savedHistory, redoStack: savedRedoStack } = JSON.parse(saved);

        if (savedFiles && Array.isArray(savedFiles)) {
          const restoredFiles = savedFiles
            .map((item: SerializableFileItem) => deserializeFileItem(item))
            .filter((item): item is FileItem => item !== null);
          console.log('[LocalStorage] Restored files:', restoredFiles.length);
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
      console.error('[LocalStorage] Failed to restore state:', e);
    }

    // 복원 완료 후 플래그 설정
    setTimeout(() => {
      isInitialMount.current = false;
      console.log('[LocalStorage] Initial mount complete, auto-save enabled');
    }, 100);
  }, []);

  // 상태 변경 시 localStorage에 저장
  useEffect(() => {
    if (isInitialMount.current) {
      console.log('[LocalStorage] Skipping save during initial mount');
      return;
    }

    try {
      const stateToSave = {
        files: files.map(serializeFileItem),
        history: history.map(items => items.map(serializeFileItem)),
        redoStack: redoStack.map(items => items.map(serializeFileItem)),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      console.log('[LocalStorage] Saved state:', files.length, 'files');
    } catch (e) {
      console.error('[LocalStorage] Failed to save state:', e);
    }
  }, [files, history, redoStack]);

  const duplicateNames = useMemo(() => {
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
  }, [files]);

  const hasDuplicates = duplicateNames.size > 0;

  const handleFiles = (fileList: FileList | File[]) => {
    const newItems: FileItem[] = Array.from(fileList).map((file: File) => {
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
    });
    setFiles(prev => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      dragCounter.current++;
      setIsDragging(true);
    }
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      dragCounter.current--;
      if (dragCounter.current <= 0) {
        setIsDragging(false);
        dragCounter.current = 0;
      }
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    dragCounter.current = 0;
    if (e.dataTransfer.files?.length > 0) handleFiles(e.dataTransfer.files);
  };

  const handleRowDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedRowIndex === null || draggedRowIndex === idx) return;
    const newFiles = [...files];
    const [draggedItem] = newFiles.splice(draggedRowIndex, 1);
    newFiles.splice(idx, 0, draggedItem);
    setDraggedRowIndex(idx);
    setFiles(newFiles);
  };

  const handleActionClick = (action: RenameAction) => {
    setCurrentAction(action);
    const noParamActions: RenameAction[] = ['CLEAR_NAME', 'CLEAR_BRACKETS', 'NUMBERS_ONLY', 'REMOVE_NUMBERS', 'RANDOM', 'EXT_DELETE'];
    if (noParamActions.includes(action)) {
      executeAction(action, params);
    } else {
      setModalOpen(true);
    }
  };

  const executeAction = (action: RenameAction, currentParams: RenameParams) => {
    setHistory(prev => [...prev, [...files]]);
    setFiles(prev => applyRenaming(prev, action, currentParams));
    setRedoStack([]); // 새 작업 시 redo 스택 초기화
    setModalOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && currentAction) {
      executeAction(currentAction, params);
    }
  };

  const undo = () => {
    if (history.length === 0) return;
    setRedoStack(prev => [...prev, [...files]]);
    setFiles(history[history.length - 1]);
    setHistory(prev => prev.slice(0, -1));
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    setHistory(prev => [...prev, [...files]]);
    setFiles(redoStack[redoStack.length - 1]);
    setRedoStack(prev => prev.slice(0, -1));
  };

  const exportAsZip = async () => {
    if (files.length === 0) return;
    if (hasDuplicates) {
      alert('중복된 파일명이 존재합니다. 파일명을 수정한 후 다시 시도해주세요.');
      return;
    }

    const zip = new JSZip();
    files.forEach(item => {
      const fileName = getFullNewName(item);
      zip.file(fileName, item.file);
    });
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const now = new Date();
    const timestamp = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, '0') + now.getDate().toString().padStart(2, '0');
    const link = document.createElement('a');
    link.href = url;
    link.download = `BatchRenamed_${timestamp}.zip`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const changedCount = useMemo(() =>
    files.filter(f => getFullNewName(f) !== `${f.originalName}.${f.originalExt}`).length,
    [files]);

  return (
    <div
      className="flex flex-col h-screen bg-gray-950 text-slate-100 overflow-hidden relative"
      onDragEnter={onDragEnter}
      onDragOver={e => e.preventDefault()}
      onDrop={onDrop}
    >
      {/* 업로드 오버레이 */}
      <div className={`absolute inset-0 z-50 bg-indigo-600/20 backdrop-blur-md border-8 border-dashed border-indigo-500/50 flex items-center justify-center transition-all duration-300 pointer-events-none ${isDragging ? 'opacity-100' : 'opacity-0'}`}>
        <div className="bg-gray-900 border border-white/10 p-20 rounded-[40px] shadow-2xl flex flex-col items-center gap-6">
          <div className="bg-indigo-500/20 p-8 rounded-3xl text-indigo-400">
            <svg className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
          </div>
          <p className="text-4xl font-black text-white">파일을 놓아주세요</p>
        </div>
      </div>

      {/* 헤더 */}
      <header className="bg-gray-950/80 premium-blur border-b border-white/10 px-8 py-5 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-900/40">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </div>
          <h1 className="text-2xl font-black text-white tracking-normal">
            LandVerse-Batch-Namer
          </h1>
        </div>
        <div className="flex gap-3">
          <Button variant="danger" size="sm" onClick={() => { if (confirm('모든 파일 목록을 초기화하시겠습니까?')) { setFiles([]); setHistory([]); setRedoStack([]); localStorage.removeItem(STORAGE_KEY); } }}>초기화</Button>
          <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>파일 추가</Button>
          <input type="file" multiple className="hidden" ref={fileInputRef} onChange={e => e.target.files && handleFiles(e.target.files)} />
          <Button
            variant={hasDuplicates ? "danger" : "primary"}
            size="sm"
            onClick={exportAsZip}
            disabled={files.length === 0}
          >
            {hasDuplicates ? "중복 발생 (수정 필요)" : "변경된 이름으로 다운로드 (ZIP)"}
          </Button>
          <a
            href="https://github.com/rukawa-dev/landverse-batch-namer"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-11 h-11 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all duration-300 text-slate-300 hover:text-white"
            title="GitHub Repository"
          >
            <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
          </a>
        </div>
      </header>

      {/* 메인 레이아웃 */}
      <main className="flex-1 flex overflow-hidden">
        {/* 사이드바 */}
        <aside className="w-72 bg-gray-950 border-r border-white/5 overflow-y-auto p-6 flex flex-col gap-8 shrink-0">
          <div>
            <p className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4 ml-1">이름 변경 규칙</p>
            <div className="space-y-1.5">
              {RENAME_ACTIONS.filter(a => a.group === 'name').map(item => (
                <Button
                  key={item.action}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-[17px] font-medium hover:bg-indigo-500/10 hover:text-indigo-300 h-12 px-4 rounded-xl border border-transparent hover:border-indigo-500/20"
                  onClick={() => handleActionClick(item.action)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="border-t border-white/5 pt-8">
            <p className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4 ml-1">확장자 관리</p>
            <div className="space-y-1.5">
              {RENAME_ACTIONS.filter(a => a.group === 'ext').map(item => (
                <Button
                  key={item.action}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-[17px] font-medium hover:bg-emerald-500/10 hover:text-emerald-300 h-12 px-4 rounded-xl border border-transparent hover:border-emerald-500/20"
                  onClick={() => handleActionClick(item.action)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </aside>

        {/* 리스트 영역 */}
        <section className="flex-1 flex flex-col bg-gray-950 overflow-hidden">
          {hasDuplicates && (
            <div className="mx-8 mt-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-4 duration-300">
              <div className="bg-rose-500 p-2 rounded-xl shadow-lg shadow-rose-900/20">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <p className="text-lg font-bold text-rose-400 italic">주의: 중복된 파일명이 존재합니다. 동일한 이름으로 저장하면 파일이 덮어씌워질 수 있습니다.</p>
            </div>
          )}

          <div className="flex-1 overflow-auto px-8 py-4">
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="sticky top-0 bg-gray-950/95 premium-blur z-10">
                <tr className="border-b border-white/10">
                  <th className="px-4 py-5 text-sm font-black text-slate-500 uppercase tracking-widest w-24 text-center">No.</th>
                  <th className="px-4 py-5 text-sm font-black text-slate-500 uppercase tracking-widest w-[calc(50%-48px)]">현재 파일명</th>
                  <th className="px-4 py-5 text-sm font-black text-slate-500 uppercase tracking-widest w-[calc(50%-48px)]">바뀔 파일명</th>
                </tr>
              </thead>
              <tbody>
                {files.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-48 text-center opacity-30">
                      <div className="flex flex-col items-center gap-6">
                        <div className="p-10 bg-white/5 rounded-full border border-white/5">
                          <svg className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                        </div>
                        <p className="text-3xl font-light">작업할 파일을 여기에 끌어다 놓으세요</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  files.map((item, idx) => {
                    const fullNewName = getFullNewName(item);
                    const hasChanged = fullNewName !== `${item.originalName}.${item.originalExt}`;
                    const isDuplicate = duplicateNames.has(fullNewName);
                    const isDragged = draggedRowIndex === idx;
                    return (
                      <tr
                        key={item.id} draggable
                        onDragStart={() => setDraggedRowIndex(idx)}
                        onDragOver={e => handleRowDragOver(e, idx)}
                        onDragEnd={() => setDraggedRowIndex(null)}
                        className={`relative transition-all group cursor-move select-none border-b border-white/[0.04] h-16 ${isDragged ? 'bg-indigo-600/20 opacity-50' : 'hover:bg-white/[0.03]'} ${isDuplicate ? 'bg-rose-500/[0.04]' : ''}`}
                      >
                        <td className="relative px-4 py-3 text-lg text-slate-500 text-center mono truncate flex items-center justify-center gap-3">
                          <div className={`absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full transition-transform origin-center ${isDuplicate ? 'bg-rose-500 scale-y-100' : 'bg-indigo-500 scale-y-0 group-hover:scale-y-100'}`}></div>
                          <svg className="h-4 w-4 opacity-0 group-hover:opacity-40 transition-opacity" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                          <span className={`${isDuplicate ? 'text-rose-400 font-bold' : 'group-hover:text-indigo-400'} transition-colors`}>{idx + 1}</span>
                        </td>
                        <td className="px-4 py-3 text-[17px] text-slate-400 truncate font-medium group-hover:text-slate-200 transition-colors">{item.originalName}<span className="text-slate-600">.{item.originalExt}</span></td>
                        <td className={`px-4 py-3 text-[18px] font-bold truncate transition-colors flex items-center gap-3 ${isDuplicate ? 'text-rose-400' : hasChanged ? 'text-indigo-400' : 'text-slate-500'}`}>
                          {fullNewName}
                          {isDuplicate && (
                            <svg className="h-5 w-5 shrink-0 text-rose-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 푸터 통계 */}
          <footer className="bg-gray-900 border-t border-white/10 px-8 py-4 flex justify-between items-center shrink-0 z-10">
            <div className="flex gap-4">
              <Button variant="secondary" size="sm" onClick={undo} disabled={history.length === 0} className="text-base font-bold">한 단계 이전</Button>
              <Button variant="secondary" size="sm" onClick={redo} disabled={redoStack.length === 0} className="text-base font-bold">한 단계 다음</Button>
            </div>
            <div className="flex gap-10 items-center text-lg font-bold text-slate-400">
              <span className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-slate-600"></span>총 {files.length}개 항목</span>
              <span className={`flex items-center gap-3 transition-colors ${hasDuplicates ? 'text-rose-400' : 'text-indigo-400'}`}>
                <span className={`w-2 h-2 rounded-full animate-pulse ${hasDuplicates ? 'bg-rose-500' : 'bg-indigo-500'}`}></span>
                {hasDuplicates ? `중복 감지: ${duplicateNames.size}건` : `변경됨: ${changedCount}건`}
              </span>
            </div>
          </footer>
        </section>
      </main>

      {/* 설정 모달 */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={RENAME_ACTIONS.find(a => a.action === currentAction)?.label || '이름 변경 설정'}
        onConfirm={() => currentAction && executeAction(currentAction, params)}
      >
        <div className="space-y-8">
          {currentAction === 'REPLACE' && (
            <div className="grid gap-8">
              <div className="space-y-3">
                <label className="text-sm font-black text-slate-500 uppercase tracking-widest ml-1 italic">원본 텍스트 (찾을 내용)</label>
                <input className="w-full px-6 py-4 bg-gray-950 border border-white/10 rounded-2xl focus:ring-4 focus:ring-indigo-500/30 outline-none text-white text-xl font-medium" value={params.search} onChange={e => setParams({ ...params, search: e.target.value })} onKeyDown={handleKeyDown} placeholder="예: 구버전" autoFocus />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-black text-slate-500 uppercase tracking-widest ml-1 italic">변경 텍스트 (바꿀 내용)</label>
                <input className="w-full px-6 py-4 bg-gray-950 border border-white/10 rounded-2xl focus:ring-4 focus:ring-indigo-500/30 outline-none text-white text-xl font-medium" value={params.replace} onChange={e => setParams({ ...params, replace: e.target.value })} onKeyDown={handleKeyDown} placeholder="예: 신버전" />
              </div>
            </div>
          )}

          {['PREFIX', 'SUFFIX', 'EXT_ADD', 'EXT_CHANGE'].includes(currentAction || '') && (
            <div className="space-y-3">
              <label className="text-sm font-black text-slate-500 uppercase tracking-widest ml-1 italic">{currentAction?.startsWith('EXT') ? '변경할 확장자' : '추가할 내용'}</label>
              <input className="w-full px-6 py-4 bg-gray-950 border border-white/10 rounded-2xl focus:ring-4 focus:ring-indigo-500/30 outline-none text-white text-xl font-medium" value={params.text} onChange={e => setParams({ ...params, text: e.target.value })} onKeyDown={handleKeyDown} placeholder={currentAction?.startsWith('EXT') ? "png (점 없이 입력)" : "내용 입력"} autoFocus />
            </div>
          )}

          {currentAction === 'PADDING' && (
            <div className="space-y-3">
              <label className="text-sm font-black text-slate-500 uppercase tracking-widest ml-1 italic">최소 자릿수 (부족하면 앞에 0을 채움)</label>
              <input type="number" className="w-full px-6 py-4 bg-gray-950 border border-white/10 rounded-2xl focus:ring-4 focus:ring-indigo-500/30 outline-none text-white text-xl font-medium" value={params.digits} onChange={e => setParams({ ...params, digits: parseInt(e.target.value) || 0 })} onKeyDown={handleKeyDown} autoFocus />
            </div>
          )}

          {currentAction === 'NUMBERING' && (
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-sm font-black text-slate-500 uppercase tracking-widest ml-1 italic">시작 번호</label>
                <input type="number" className="w-full px-6 py-4 bg-gray-950 border border-white/10 rounded-2xl focus:ring-4 focus:ring-indigo-500/30 outline-none text-white text-xl font-medium" value={params.start} onChange={e => setParams({ ...params, start: parseInt(e.target.value) || 1 })} onKeyDown={handleKeyDown} />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-black text-slate-500 uppercase tracking-widest ml-1 italic">번호 자릿수</label>
                <input type="number" className="w-full px-6 py-4 bg-gray-950 border border-white/10 rounded-2xl focus:ring-4 focus:ring-indigo-500/30 outline-none text-white text-xl font-medium" value={params.digits} onChange={e => setParams({ ...params, digits: parseInt(e.target.value) || 1 })} onKeyDown={handleKeyDown} />
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default App;
