// src/utils/validators.js
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone) => {
  const phoneRegex = /^[0-9-+\s()]+$/;
  return phoneRegex.test(phone);
};

export const validateRequired = (value) => {
  return value && value.toString().trim().length > 0;
};

export const validateCaseNumber = (caseNumber) => {
  // 사건번호 형식: YYYY-MMDD-NNN
  const caseNumberRegex = /^\d{4}-\d{4}-\d{3}$/;
  return caseNumberRegex.test(caseNumber);
};

export const validateLocation = (location) => {
  return location && location.trim().length >= 5;
};