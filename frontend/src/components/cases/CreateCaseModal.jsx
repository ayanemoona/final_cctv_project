// src/components/cases/CreateCaseModal.jsx - FormData 방식으로 완전 수정
import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { Modal } from '../common/Modal.jsx';
import { LoadingSpinner } from '../common/LoadingSpinner.jsx';
import { validateRequired, validateLocation } from '../../utils/validators.js';

export const CreateCaseModal = ({ isOpen, onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    case_number: '',
    title: '',
    location: '',
    incident_date: '',
    description: '',
    suspect_description: '',
    suspect_image: null  // File 객체로 저장
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    
    if (name === 'suspect_image' && files && files[0]) {
      // 파일 업로드 처리
      const file = files[0];
      
      // 파일 크기 제한 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          suspect_image: '파일 크기는 5MB 이하여야 합니다.'
        }));
        return;
      }
      
      // 이미지 파일만 허용
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({
          ...prev,
          suspect_image: '이미지 파일만 업로드 가능합니다.'
        }));
        return;
      }
      
      // File 객체 직접 저장
      setFormData(prev => ({
        ...prev,
        suspect_image: file
      }));
      
      // 에러 클리어
      setErrors(prev => ({
        ...prev,
        suspect_image: null
      }));
      
      console.log('이미지 파일 선택됨:', file.name);
    } else {
      // 일반 텍스트 입력 처리
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // 실시간 유효성 검사
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
    
    // 제출 에러 클리어
    if (submitError) {
      setSubmitError('');
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!validateRequired(formData.title)) {
      newErrors.title = '사건명을 입력해주세요.';
    }
    
    if (!validateLocation(formData.location)) {
      newErrors.location = '발생장소를 5자 이상 입력해주세요.';
    }
    
    if (!validateRequired(formData.incident_date)) {
      newErrors.incident_date = '발생일시를 선택해주세요.';
    }
    
    if (!validateRequired(formData.description)) {
      newErrors.description = '사건 개요를 입력해주세요.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setSubmitError('');
    
    try {
      // 사건번호 자동 생성
      const now = new Date();
      const caseNumber = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`;
      
      // ✅ Django 모델 필드명에 맞게 수정
      const caseData = {
        case_number: caseNumber,
        title: formData.title,
        description: formData.description,
        incident_date: formData.incident_date,
        location: formData.location, // ✅ location_name이 아닌 location
        status: 'active',
        suspect_description: formData.suspect_description || '용의자 정보', // 기본값 설정
        suspect_image: formData.suspect_image
      };
      
      console.log('전송할 사건 데이터:', caseData);
      
      await onCreate(caseData);
      
      // 성공시 폼 초기화 및 모달 닫기
      setFormData({
        case_number: '',
        title: '',
        location: '',
        incident_date: '',
        description: '',
        suspect_description: '',
        suspect_image: null
      });
      setErrors({});
      setSubmitError('');
      onClose();
      
    } catch (err) {
      console.error('사건 생성 실패:', err);
      setSubmitError(err.message || '사건 등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 모달 닫기 시 상태 초기화
  const handleClose = () => {
    if (!loading) {
      setFormData({
        case_number: '',
        title: '',
        location: '',
        incident_date: '',
        description: '',
        suspect_description: '',
        suspect_image: null
      });
      setErrors({});
      setSubmitError('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="새 사건 등록" size="large">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 제출 에러 표시 */}
        {submitError && (
          <div className="error-content" style={{ marginBottom: '1rem' }}>
            <div className="error-header">
              <div>
                <h3 className="error-title">등록 실패</h3>
                <p className="error-message">{submitError}</p>
              </div>
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">사건명 *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className={`form-input ${errors.title ? 'error' : ''}`}
            placeholder="예: 화홍동 편의점 절도 사건"
            disabled={loading}
          />
          {errors.title && (
            <p className="form-error">{errors.title}</p>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">발생장소 *</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className={`form-input ${errors.location ? 'error' : ''}`}
            placeholder="예: 수원시 영통구 화홍동 123번지"
            disabled={loading}
          />
          {errors.location && (
            <p className="form-error">{errors.location}</p>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">발생일시 *</label>
          <input
            type="datetime-local"
            name="incident_date"
            value={formData.incident_date}
            onChange={handleChange}
            className={`form-input ${errors.incident_date ? 'error' : ''}`}
            disabled={loading}
          />
          {errors.incident_date && (
            <p className="form-error">{errors.incident_date}</p>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">사건 개요 *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className={`form-textarea ${errors.description ? 'error' : ''}`}
            placeholder="사건의 상세 내용을 입력해주세요."
            disabled={loading}
          />
          {errors.description && (
            <p className="form-error">{errors.description}</p>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">용의자 특징 (선택)</label>
          <textarea
            name="suspect_description"
            value={formData.suspect_description}
            onChange={handleChange}
            rows={2}
            className="form-textarea"
            placeholder="예: 남성, 170cm 내외, 검은색 후드티, 청바지"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label className="form-label">용의자 사진 (선택)</label>
          <div className="upload-area">
            <Upload className="upload-icon" />
            <div className="upload-content">
              <input
                type="file"
                name="suspect_image"
                onChange={handleChange}
                accept="image/*"
                className="upload-input"
                id="suspect-image-upload"
                disabled={loading}
              />
              <label htmlFor="suspect-image-upload" className="upload-label">
                사진을 클릭하여 업로드 (최대 5MB)
              </label>
            </div>
            {formData.suspect_image && (
              <p className="upload-filename">
                선택된 파일: {formData.suspect_image.name}
              </p>
            )}
            {errors.suspect_image && (
              <p className="form-error">{errors.suspect_image}</p>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-secondary"
            disabled={loading}
          >
            취소
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <LoadingSpinner size="small" message="" />
            ) : (
              <span>등록</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};