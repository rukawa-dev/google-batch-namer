
import React, { useState, useRef, useMemo } from 'react';
import { FileItem, RenameAction, RenameParams } from './types';
import { Button } from './components/Button';
import { Modal } from './components/Modal';
import { applyRenaming, getFullNewName } from './logic/renamingLogic';

// 외부 라이브러리 선언
declare const JSZip: any;

// 사이드바 액션 구성 데이터
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
  { label: '확장자 삭제', action: 'EXT_DELETE', group: 'ext' },
  { label: '확장자 추가', action: 'EXT_ADD', group: 'ext' },
  { label: '확장자 변경', action: 'EXT_CHANGE', group: 'ext' },
];

const App: React.FC = () => {
  // 상태 관리
  const [files, setFiles] = useState<FileItem[]>([]);
  const [history, setHistory] = useState<FileItem[][]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
  const [currentAction, setCurrentAction] = useState<RenameAction | null>(null);
  const [params, setParams] = useState<RenameParams>({ search: '', replace: '', text: '', start: 1, digits: 2 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // 실시간 중복 감지 로직
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

  // 파일 처리 로직
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

  // 드래그 앤 드롭 핸들러
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

  // 행 순서 변경 핸들러
  const handleRowDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedRowIndex === null || draggedRowIndex === idx) return;
    const newFiles = [...files];
    const [draggedItem] = newFiles.splice(draggedRowIndex, 1);
    newFiles.splice(idx, 0, draggedItem);
    setDraggedRowIndex(idx);
    setFiles(newFiles);
  };

  // 액션 실행 핸들러
  const handleActionClick = (action: RenameAction) => {
    setCurrentAction(action);
    const noParamActions: RenameAction[] = ['CLEAR_NAME', 'CLEAR_BRACKETS', 'NUMBERS_ONLY', 'REMOVE_NUMBERS', 'EXT_DELETE'];
    if (noParamActions.includes(action)) {
       executeAction(action, params);
    } else {
       setModalOpen(true);
    }
  };

  const executeAction = (action: RenameAction, currentParams: RenameParams) => {
    setHistory(prev => [...prev, [...files]]);
    setFiles(prev => applyRenaming(prev, action, currentParams));
    setModalOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && currentAction) {
      executeAction(currentAction, params);
    }
  };

  // 기타 유틸리티
  const undo = () => {
    if (history.length === 0) return;
    setFiles(history[history.length - 1]);
    setHistory(prev => prev.slice(0, -1));
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
    const timestamp = now.getFullYear().toString() + 
                     (now.getMonth() + 1).toString().padStart(2, '0') + 
                     now.getDate().toString().padStart(2, '0') + '_' +
                     now.getHours().toString().padStart(2, '0') +
                     now.getMinutes().toString().padStart(2, '0') +
                     now.getSeconds().toString().padStart(2, '0');

    const link = document.createElement('a');
    link.href = url;
    link.download = `파일명_일괄_변경_${timestamp}.zip`;
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
      <div className={`absolute inset-0 z-50 bg-indigo-600/10 backdrop-blur-sm border-4 border-dashed border-indigo-500/50 flex items-center justify-center transition-all duration-300 pointer-events-none ${isDragging ? 'opacity-100' : 'opacity-0'}`}>
        <div className="bg-gray-900 border border-white/5 p-12 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
          <div className="bg-indigo-500/20 p-6 rounded-2xl text-indigo-400">
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
          </div>
          <p className="text-2xl font-bold text-white">파일을 놓아주세요</p>
        </div>
      </div>

      {/* 헤더 */}
      <header className="bg-gray-950/80 premium-blur border-b border-white/5 px-6 py-3 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-900/30">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </div>
          <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            파일명 일괄 변경 <span className="text-[9px] font-medium bg-white/5 border border-white/10 px-1.5 py-0.5 rounded uppercase text-slate-400">v1.0</span>
          </h1>
        </div>
        <div className="flex gap-2">
           <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>파일 추가</Button>
           <input type="file" multiple className="hidden" ref={fileInputRef} onChange={e => e.target.files && handleFiles(e.target.files)} />
           <Button 
            variant={hasDuplicates ? "danger" : "primary"} 
            size="sm" 
            onClick={exportAsZip} 
            disabled={files.length === 0} 
            className="px-4"
           >
             {hasDuplicates ? "중복 발생" : "다운로드(ZIP)"}
           </Button>
        </div>
      </header>

      {/* 메인 레이아웃 */}
      <main className="flex-1 flex overflow-hidden">
        {/* 사이드바 */}
        <aside className="w-56 bg-gray-950 border-r border-white/5 overflow-y-auto p-4 flex flex-col gap-4 shrink-0">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">이름 변경</p>
            <div className="space-y-0.5">
              {RENAME_ACTIONS.filter(a => a.group === 'name').map(item => (
                <Button 
                  key={item.action} 
                  variant="ghost" 
                  size="sm"
                  className="w-full justify-start text-[13px] hover:bg-white/5 h-8 px-2" 
                  onClick={() => handleActionClick(item.action)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="border-t border-white/5 pt-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">확장자 관리</p>
            <div className="space-y-0.5">
              {RENAME_ACTIONS.filter(a => a.group === 'ext').map(item => (
                <Button 
                  key={item.action} 
                  variant="ghost" 
                  size="sm"
                  className="w-full justify-start text-[13px] hover:bg-white/5 h-8 px-2" 
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
           {/* 중복 경고 배너 */}
           {hasDuplicates && (
             <div className="mx-6 mt-4 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
               <div className="bg-rose-500 p-1 rounded-full">
                 <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
               </div>
               <p className="text-[11px] font-bold text-rose-400">주의: 중복된 파일명이 존재합니다. 이대로 저장하면 파일이 덮어씌워집니다.</p>
             </div>
           )}

           <div className="flex-1 overflow-auto px-6 py-2">
              <table className="w-full text-left border-collapse table-fixed">
                <thead className="sticky top-0 bg-gray-950/95 premium-blur z-10">
                  <tr className="border-b border-white/5">
                    <th className="px-3 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest w-16 text-center">번호</th>
                    <th className="px-3 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest w-[calc(50%-32px)]">현재 이름</th>
                    <th className="px-3 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest w-[calc(50%-32px)]">바뀔 이름</th>
                  </tr>
                </thead>
                <tbody className="">
                  {files.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-32 text-center opacity-40">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-6 bg-white/5 rounded-full border border-white/5">
                            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                          </div>
                          <p className="text-lg font-medium">목록이 비어있습니다</p>
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
                          className={`relative transition-all group cursor-move select-none border-b border-white/[0.03] ${isDragged ? 'bg-indigo-600/10 opacity-50' : 'hover:bg-white/[0.02]'} ${isDuplicate ? 'bg-rose-500/[0.02]' : ''}`}
                        >
                          <td className="relative px-3 py-2 text-[12px] text-slate-500 text-center mono truncate flex items-center justify-center gap-2">
                            <div className={`absolute left-0 top-1 bottom-1 w-[2px] rounded-r-full transition-transform origin-center ${isDuplicate ? 'bg-rose-500 scale-y-100' : 'bg-indigo-500 scale-y-0 group-hover:scale-y-100'}`}></div>
                            <svg className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                            <span className={`${isDuplicate ? 'text-rose-400' : 'group-hover:text-indigo-400'} transition-colors`}>{idx + 1}</span>
                          </td>
                          <td className="px-3 py-2 text-[13px] text-slate-400 truncate font-medium group-hover:text-slate-300 transition-colors">{item.originalName}<span className="text-slate-600">.{item.originalExt}</span></td>
                          <td className={`px-3 py-2 text-[13px] font-semibold truncate transition-colors flex items-center gap-2 ${isDuplicate ? 'text-rose-400' : hasChanged ? 'text-indigo-400' : 'text-slate-500'}`}>
                            {fullNewName}
                            {isDuplicate && (
                               <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
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
           <footer className="bg-gray-900 border-t border-white/5 px-6 py-2.5 flex justify-between items-center text-[10px] font-semibold text-slate-500 tracking-wider shrink-0 z-10">
             <div className="flex gap-2">
               <Button variant="ghost" size="sm" onClick={undo} disabled={history.length === 0} className="text-[10px] px-2 h-7 border border-white/5">작업 취소</Button>
               <Button variant="ghost" size="sm" onClick={() => {setFiles([]); setHistory([]);}} className="text-red-400/70 hover:bg-red-500/10 hover:text-red-300 text-[10px] px-2 h-7 border border-red-500/10">목록 비우기</Button>
             </div>
             <div className="flex gap-6 items-center">
               <span className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-slate-700"></span>총 {files.length}개 파일</span>
               <span className={`flex items-center gap-2 transition-colors ${hasDuplicates ? 'text-rose-400' : 'text-indigo-400/80'}`}>
                 <span className={`w-1 h-1 rounded-full animate-pulse ${hasDuplicates ? 'bg-rose-500' : 'bg-indigo-500'}`}></span>
                 {hasDuplicates ? `중복 발생: ${duplicateNames.size}종` : `변경 예정: ${changedCount}개`}
               </span>
             </div>
           </footer>
        </section>
      </main>

      {/* 설정 모달 */}
      <Modal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={RENAME_ACTIONS.find(a => a.action === currentAction)?.label || '설정'}
        onConfirm={() => currentAction && executeAction(currentAction, params)}
      >
        <div className="space-y-6">
          {currentAction === 'REPLACE' && (
            <div className="grid gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">찾을 단어</label>
                <input className="w-full px-4 py-3 bg-gray-950 border border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-slate-200" value={params.search} onChange={e => setParams({...params, search: e.target.value})} onKeyDown={handleKeyDown} placeholder="원본 텍스트" autoFocus />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">바꿀 단어</label>
                <input className="w-full px-4 py-3 bg-gray-950 border border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-slate-200" value={params.replace} onChange={e => setParams({...params, replace: e.target.value})} onKeyDown={handleKeyDown} placeholder="새 텍스트" />
              </div>
            </div>
          )}

          {['PREFIX', 'SUFFIX', 'EXT_ADD', 'EXT_CHANGE'].includes(currentAction || '') && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{currentAction?.startsWith('EXT') ? '확장자' : '추가할 텍스트'}</label>
              <input className="w-full px-4 py-3 bg-gray-950 border border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-slate-200" value={params.text} onChange={e => setParams({...params, text: e.target.value})} onKeyDown={handleKeyDown} placeholder={currentAction?.startsWith('EXT') ? "png" : "(수정)"} autoFocus />
            </div>
          )}

          {currentAction === 'PADDING' && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">최소 자릿수</label>
              <input type="number" className="w-full px-4 py-3 bg-gray-950 border border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-slate-200" value={params.digits} onChange={e => setParams({...params, digits: parseInt(e.target.value) || 0})} onKeyDown={handleKeyDown} autoFocus />
            </div>
          )}

          {currentAction === 'NUMBERING' && (
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">시작 번호</label>
                <input type="number" className="w-full px-4 py-3 bg-gray-950 border border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-slate-200" value={params.start} onChange={e => setParams({...params, start: parseInt(e.target.value) || 1})} onKeyDown={handleKeyDown} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">번호 자릿수</label>
                <input type="number" className="w-full px-4 py-3 bg-gray-950 border border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-slate-200" value={params.digits} onChange={e => setParams({...params, digits: parseInt(e.target.value) || 1})} onKeyDown={handleKeyDown} />
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default App;
