
import { FileItem, RenameAction, RenameParams } from '../types';

/**
 * 파일명 변경 로직을 적용한 새 파일 목록을 반환합니다.
 */
export const applyRenaming = (
  items: FileItem[], 
  action: RenameAction, 
  params: RenameParams
): FileItem[] => {
  return items.map((item, index) => {
    let newName = item.newName;
    let newExt = item.newExt;

    // 공통 파라미터 추출
    const { search = '', replace = '', text = '', start = 1, digits = 1 } = params;

    switch (action) {
      case 'REPLACE':
        if (search) {
          newName = newName.split(search).join(replace);
        }
        break;
      case 'PREFIX':
        newName = text + newName;
        break;
      case 'SUFFIX':
        newName = newName + text;
        break;
      case 'CLEAR_NAME':
        newName = '';
        break;
      case 'CLEAR_BRACKETS':
        // 모든 종류의 괄호 및 내부 텍스트 제거
        newName = newName.replace(/\[.*?\]|\(.*?\)|\{.*?\}/g, '');
        break;
      case 'REMOVE_NUMBERS':
        newName = newName.replace(/[0-9]/g, '');
        break;
      case 'NUMBERS_ONLY':
        newName = newName.replace(/[^0-9]/g, '');
        break;
      case 'PADDING':
        if (newName.length < digits) {
          newName = newName.padStart(digits, '0');
        }
        break;
      case 'NUMBERING':
        const numStr = (start + index).toString().padStart(digits, '0');
        newName = newName + numStr;
        break;
      case 'EXT_DELETE':
        newExt = '';
        break;
      case 'EXT_ADD':
      case 'EXT_CHANGE':
        // 확장자에서 불필요한 점(.) 제거 후 설정
        newExt = text.replace(/^\./, '');
        break;
      default:
        break;
    }

    return { ...item, newName, newExt };
  });
};

/**
 * 변경될 최종 파일명(이름 + 확장자)을 반환합니다.
 */
export const getFullNewName = (item: FileItem): string => {
  return item.newExt ? `${item.newName}.${item.newExt}` : item.newName;
};
