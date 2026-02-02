export const STORAGE_KEY = 'landverse-batch-namer-state';

export const RENAME_ACTIONS = [
  { label: '이름 지우기', action: 'CLEAR_NAME' as const, group: 'name' as const },
  { label: '문자열 바꾸기', action: 'REPLACE' as const, group: 'name' as const },
  { label: '앞이름 붙이기', action: 'PREFIX' as const, group: 'name' as const },
  { label: '뒷이름 붙이기', action: 'SUFFIX' as const, group: 'name' as const },
  { label: '괄호안 지우기', action: 'CLEAR_BRACKETS' as const, group: 'name' as const },
  { label: '숫자만 지우기', action: 'REMOVE_NUMBERS' as const, group: 'name' as const },
  { label: '숫자만 남기기', action: 'NUMBERS_ONLY' as const, group: 'name' as const },
  { label: '자릿수 맞추기', action: 'PADDING' as const, group: 'name' as const },
  { label: '번호 붙이기', action: 'NUMBERING' as const, group: 'name' as const },
  { label: '난수로 변경', action: 'RANDOM' as const, group: 'name' as const },
  { label: '확장자 삭제', action: 'EXT_DELETE' as const, group: 'ext' as const },
  { label: '확장자 추가', action: 'EXT_ADD' as const, group: 'ext' as const },
  { label: '확장자 변경', action: 'EXT_CHANGE' as const, group: 'ext' as const },
];
