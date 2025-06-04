// src/utils/constants.js
export const API_BASE_URL = 'http://127.0.0.1:8000';

export const CASE_STATUS = {
  ACTIVE: 'active',
  CLOSED: 'closed',
  SUSPENDED: 'suspended'
};

export const CASE_STATUS_LABELS = {
  [CASE_STATUS.ACTIVE]: '수사중',
  [CASE_STATUS.CLOSED]: '종료',
  [CASE_STATUS.SUSPENDED]: '보류'
};

export const MARKER_STATUS = {
  CONFIRMED: 'confirmed',
  EXCLUDED: 'excluded',
  PENDING: 'pending'
};

export const USER_RANKS = [
  '순경', '경장', '경사', '경위', '경감', '경정', '총경', '경무관'
];

export const DEPARTMENTS = [
  '수사과', '형사과', '교통과', '정보과', '경무과', '생활안전과'
];