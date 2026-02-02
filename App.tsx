
import React, { useState, useRef, useCallback } from 'react';
import { FileItem, RenameAction, RenameParams } from './types';
import { Button } from './components/Button';
import { Modal } from './components/Modal';
import { applyRenaming, getFullNewName } from './logic/renamingLogic';

// Add JSZip types manually or cast
declare const JSZip: any;

const App: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [history, setHistory] = useState<FileItem[][]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [currentAction, setCurrentAction] = useState<RenameAction | null>(null);
  const [params, setParams] = useState<RenameParams>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleFiles = (fileList: FileList | File[]) => {
    const newItems: FileItem[] = Array.from(fileList).map((file: File) => {
      const parts = file.name.split('.');
      const ext = parts.length > 1 ? parts.pop()! : '';
      const name = parts.join('.');
      return {
        id: Math.random().toString(36).substring(2, 11),
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

  const addFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  };

  // Improved Drag & Drop Handling
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleAction = (action: RenameAction) => {
    setCurrentAction(action);
    setParams({ search: '', replace: '', text: '', start: 1, digits: 2 });
    if (['CLEAR_NAME', 'CLEAR_BRACKETS', 'NUMBERS_ONLY', 'EXT_DELETE'].includes(action)) {
       applyAction(action, {});
    } else {
       setModalOpen(true);
    }
  };

  const applyAction = (action: RenameAction, currentParams: RenameParams) => {
    setHistory(prev => [...prev, [...files]]);
    const updated = applyRenaming(files, action, currentParams);
    setFiles(updated);
    setModalOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && currentAction) {
      applyAction(currentAction, params);
    }
  };

  const undo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setFiles(last);
    setHistory(prev => prev.slice(0, -1));
  };

  const clearList = () => {
    setFiles([]);
    setHistory([]);
  };

  const exportFiles = async () => {
    if (files.length === 0) return;
    const zip = new JSZip();
    files.forEach(item => {
      const fileName = item.newExt ? `${item.newName}.${item.newExt}` : item.newName;
      zip.file(fileName, item.file);
    });
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `renamed_files_${new Date().getTime()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getActionTitle = (action: RenameAction | null) => {
    switch (action) {
      case 'REPLACE': return '문자열 바꾸기';
      case 'PREFIX': return '앞이름 붙이기';
      case 'SUFFIX': return '뒷이름 붙이기';
      case 'CLEAR_POS': return '위치 지우기';
      case 'PADDING': return '자릿수 맞추기';
      case 'NUMBERING': return '번호 붙이기';
      case 'EXT_ADD': return '확장자 추가';
      case 'EXT_CHANGE': return '확장자 변경';
      default: return '설정';
    }
  };

  return (
    <div 
      className="flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay - Using pointer-events-none to prevent flickering */}
      <div 
        className={`absolute inset-0 z-50 bg-blue-600/20 backdrop-blur-[4px] border-4 border-dashed border-blue-500 flex items-center justify-center transition-opacity duration-200 pointer-events-none ${isDragging ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
          <div className="bg-blue-600/20 p-4 rounded-full text-blue-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-xl font-bold text-slate-100">파일을 여기에 놓으세요</p>
          <p className="text-sm text-slate-400">목록에 파일이 바로 추가됩니다</p>
        </div>
      </div>

      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-lg shadow-blue-900/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">파일명 일괄 변경툴 <span className="text-xs font-normal text-slate-500 ml-1">v1.0 DARK</span></h1>
        </div>
        <div className="flex gap-2">
           <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
             파일 추가
           </Button>
           <input type="file" multiple className="hidden" ref={fileInputRef} onChange={addFiles} />
           <Button variant="primary" onClick={exportFiles} disabled={files.length === 0}>
             일괄 변경 적용 (ZIP)
           </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-56 bg-slate-900 border-r border-slate-800 overflow-y-auto p-4 flex flex-col gap-1 shrink-0">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">파일명 변경</p>
          <Button variant="ghost" className="justify-start gap-3" onClick={() => handleAction('CLEAR_NAME')}>이름 지우기</Button>
          <Button variant="ghost" className="justify-start gap-3" onClick={() => handleAction('REPLACE')}>문자열 바꾸기</Button>
          <Button variant="ghost" className="justify-start gap-3" onClick={() => handleAction('PREFIX')}>앞이름 붙이기</Button>
          <Button variant="ghost" className="justify-start gap-3" onClick={() => handleAction('SUFFIX')}>뒷이름 붙이기</Button>
          <Button variant="ghost" className="justify-start gap-3" onClick={() => handleAction('CLEAR_BRACKETS')}>괄호안 지우기</Button>
          <Button variant="ghost" className="justify-start gap-3" onClick={() => handleAction('NUMBERS_ONLY')}>숫자만 남기기</Button>
          <Button variant="ghost" className="justify-start gap-3" onClick={() => handleAction('PADDING')}>자릿수 맞추기</Button>
          <Button variant="ghost" className="justify-start gap-3" onClick={() => handleAction('NUMBERING')}>번호 붙이기</Button>
          
          <hr className="my-3 border-slate-800" />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">확장자 관리</p>
          <Button variant="ghost" className="justify-start gap-3" onClick={() => handleAction('EXT_DELETE')}>확장자 삭제</Button>
          <Button variant="ghost" className="justify-start gap-3" onClick={() => handleAction('EXT_ADD')}>확장자 추가</Button>
          <Button variant="ghost" className="justify-start gap-3" onClick={() => handleAction('EXT_CHANGE')}>확장자 변경</Button>
        </aside>

        {/* Center Table */}
        <section className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
           <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-900/90 backdrop-blur-md z-10 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-12 text-center">NO</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">현재 이름</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">바뀔 이름</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {files.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-24 text-center text-slate-600">
                        <div className="flex flex-col items-center gap-4">
                          <div className="p-6 bg-slate-900 rounded-full border border-slate-800">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                          <p className="text-slate-500">파일을 드래그하거나 [파일 추가]를 클릭하세요</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    files.map((item, idx) => {
                       const fullNewName = getFullNewName(item);
                       const hasChanged = fullNewName !== `${item.originalName}.${item.originalExt}`;
                       return (
                        <tr key={item.id} className="hover:bg-slate-900/50 transition-colors group">
                          <td className="px-4 py-3 text-xs text-slate-600 text-center mono">{idx + 1}</td>
                          <td className="px-4 py-3 text-sm text-slate-400 truncate max-w-[200px] md:max-w-xs">{item.originalName}.{item.originalExt}</td>
                          <td className={`px-4 py-3 text-sm font-medium truncate max-w-[200px] md:max-w-xs ${hasChanged ? 'text-blue-400' : 'text-slate-200'}`}>
                            {fullNewName}
                          </td>
                        </tr>
                       );
                    })
                  )}
                </tbody>
              </table>
           </div>

           {/* Footer Stats */}
           <div className="bg-slate-900 border-t border-slate-800 px-6 py-3 flex justify-between items-center text-xs text-slate-500 font-medium shrink-0">
             <div className="flex gap-6 items-center">
               <span className="flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                 총 {files.length} 개의 파일
               </span>
               <span className="flex items-center gap-2 text-blue-400">
                 <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                 {files.filter(f => getFullNewName(f) !== `${f.originalName}.${f.originalExt}`).length} 개 변경 예정
               </span>
             </div>
             <div className="flex gap-3">
               <Button variant="ghost" size="sm" onClick={undo} disabled={history.length === 0}>작업 취소</Button>
               <Button variant="ghost" size="sm" onClick={clearList} className="text-red-400 hover:bg-red-950/30 hover:text-red-300">목록 비우기</Button>
             </div>
           </div>
        </section>
      </main>

      {/* Modal for Parameters */}
      <Modal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={getActionTitle(currentAction)}
        onConfirm={() => currentAction && applyAction(currentAction, params)}
      >
        <div className="space-y-4">
          {currentAction === 'REPLACE' && (
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">찾을 문자열</label>
                <input 
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-slate-200"
                  value={params.search || ''}
                  onChange={e => setParams({...params, search: e.target.value})}
                  onKeyDown={handleKeyDown}
                  placeholder="예: old_name"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">바꿀 문자열</label>
                <input 
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-slate-200"
                  value={params.replace || ''}
                  onChange={e => setParams({...params, replace: e.target.value})}
                  onKeyDown={handleKeyDown}
                  placeholder="예: new_name"
                />
              </div>
            </div>
          )}

          {(currentAction === 'PREFIX' || currentAction === 'SUFFIX' || currentAction === 'EXT_ADD' || currentAction === 'EXT_CHANGE') && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase">
                {currentAction.startsWith('EXT') ? '확장자 명' : '추가할 문자열'}
              </label>
              <input 
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-slate-200"
                value={params.text || ''}
                onChange={e => setParams({...params, text: e.target.value})}
                onKeyDown={handleKeyDown}
                placeholder={currentAction.startsWith('EXT') ? '예: jpg' : '예: [배포] '}
                autoFocus
              />
            </div>
          )}

          {currentAction === 'PADDING' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase">최소 자릿수</label>
              <input 
                type="number"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-slate-200"
                value={params.digits || 0}
                onChange={e => setParams({...params, digits: parseInt(e.target.value) || 0})}
                onKeyDown={handleKeyDown}
                autoFocus
              />
            </div>
          )}

          {currentAction === 'NUMBERING' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">시작 번호</label>
                <input 
                  type="number"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-slate-200"
                  value={params.start || 1}
                  onChange={e => setParams({...params, start: parseInt(e.target.value) || 1})}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">번호 자릿수</label>
                <input 
                  type="number"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-slate-200"
                  value={params.digits || 1}
                  onChange={e => setParams({...params, digits: parseInt(e.target.value) || 1})}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default App;
