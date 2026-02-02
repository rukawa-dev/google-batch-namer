
import { FileItem, RenameAction, RenameParams } from '../types';

export const applyRenaming = (
  items: FileItem[], 
  action: RenameAction, 
  params: RenameParams
): FileItem[] => {
  return items.map((item, index) => {
    let newName = item.newName;
    let newExt = item.newExt;

    switch (action) {
      case 'REPLACE':
        if (params.search) {
          newName = newName.split(params.search).join(params.replace || '');
        }
        break;
      case 'PREFIX':
        newName = (params.text || '') + newName;
        break;
      case 'SUFFIX':
        newName = newName + (params.text || '');
        break;
      case 'CLEAR_NAME':
        newName = '';
        break;
      case 'CLEAR_BRACKETS':
        newName = newName.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').replace(/\{.*?\}/g, '');
        break;
      case 'NUMBERS_ONLY':
        newName = newName.replace(/[^0-9]/g, '');
        break;
      case 'PADDING':
        const targetLen = params.digits || 0;
        if (newName.length < targetLen) {
            newName = newName.padStart(targetLen, '0');
        }
        break;
      case 'NUMBERING':
        const start = params.start || 1;
        const digits = params.digits || 1;
        const numStr = (start + index).toString().padStart(digits, '0');
        newName = newName + numStr;
        break;
      case 'EXT_DELETE':
        newExt = '';
        break;
      case 'EXT_ADD':
        newExt = (params.text || '');
        break;
      case 'EXT_CHANGE':
        newExt = (params.text || '');
        break;
    }

    return { ...item, newName, newExt };
  });
};

export const getFullNewName = (item: FileItem) => {
    return item.newExt ? `${item.newName}.${item.newExt}` : item.newName;
};
