// src/services/htmlToPdfService.js - 타임라인 제거 + 페이지 분할 개선된 버전

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

class HTMLToPDFService {
  constructor() {
    this.pageWidth = 210; // A4 width in mm
    this.pageHeight = 297; // A4 height in mm
    this.margin = 15; // 여백 증가로 안정성 향상
  }

  /**
   * HTML 템플릿을 PDF로 변환 (한글 완벽 지원) - 개선된 버전
   */
  async generateCaseTrackingReport(caseData, markers, mapElementId = null) {
    try {
      console.log('📄 개선된 HTML → PDF 보고서 생성 시작');
      
      // ✅ 제외된 마커(X 마커) 필터링
      const validMarkers = markers.filter(marker => 
        marker.is_confirmed && !marker.is_excluded
      );
      
      if (validMarkers.length === 0) {
        throw new Error('추적 가능한 마커가 없어 보고서를 생성할 수 없습니다.');
      }

      // 1. 개선된 HTML 보고서 생성 (타임라인 제거)
      const htmlContent = this.createReportHTML(caseData, validMarkers, mapElementId);
      
      // 2. HTML을 임시 div에 렌더링 (개선된 스타일)
      const reportDiv = document.createElement('div');
      reportDiv.innerHTML = htmlContent;
      reportDiv.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        width: 800px;
        background: white;
        font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif;
        padding: 30px;
        box-sizing: border-box;
        line-height: 1.6;
      `;
      
      document.body.appendChild(reportDiv);
      
      // 3. 폰트 로드 대기 (개선된 대기 시간)
      await this.waitForFonts();
      
      // 4. HTML을 고품질 이미지로 캡처
      const canvas = await html2canvas(reportDiv, {
        scale: 2.5, // 해상도 향상
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 800,
        height: reportDiv.scrollHeight,
        logging: false, // 로그 제거로 성능 향상
        onclone: (clonedDoc) => {
          // 클론된 문서에서 추가 스타일 적용
          const style = clonedDoc.createElement('style');
          style.textContent = `
            * { box-sizing: border-box; }
            table { border-collapse: collapse !important; }
            th, td { border: 1px solid #e5e7eb !important; }
          `;
          clonedDoc.head.appendChild(style);
        }
      });
      
      // 5. 개선된 PDF 생성
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true // 파일 크기 최적화
      });
      
      const imgData = canvas.toDataURL('image/png', 0.95); // 품질 최적화
      
      // 6. 개선된 페이지 분할 로직
      const pageWidth = this.pageWidth - (this.margin * 2);
      const pageHeight = this.pageHeight - (this.margin * 2);
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      
      let pageNumber = 1;
      
      // 첫 페이지 추가
      pdf.addImage(
        imgData, 
        'PNG', 
        this.margin, 
        this.margin, 
        imgWidth, 
        imgHeight
      );
      
      // 내용이 한 페이지를 넘는 경우 추가 페이지 처리
      let remainingHeight = imgHeight - pageHeight;
      
      while (remainingHeight > 0) {
        pdf.addPage();
        pageNumber++;
        
        // 다음 페이지에 표시할 y 위치 계산
        const yPosition = -pageHeight * (pageNumber - 1);
        
        pdf.addImage(
          imgData, 
          'PNG', 
          this.margin, 
          this.margin + yPosition, 
          imgWidth, 
          imgHeight
        );
        
        remainingHeight -= pageHeight;
      }
      
      // 7. 페이지 번호 추가
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text(
          `${i} / ${totalPages}`, 
          this.pageWidth - this.margin, 
          this.pageHeight - 5, 
          { align: 'right' }
        );
      }
      
      // 8. 임시 div 제거
      document.body.removeChild(reportDiv);
      
      // 9. PDF 다운로드
      const fileName = `사건추적보고서_${caseData.case_number}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      console.log('✅ 개선된 HTML → PDF 보고서 생성 완료:', fileName);
      return { 
        success: true, 
        fileName, 
        markerCount: validMarkers.length,
        pages: totalPages 
      };
      
    } catch (error) {
      console.error('❌ HTML → PDF 생성 실패:', error);
      throw new Error(`PDF 보고서 생성에 실패했습니다: ${error.message}`);
    }
  }

  /**
   * 개별 마커 상세 보고서 (HTML → PDF) - 개선된 버전
   */
  async generateMarkerDetailReport(caseData, marker) {
    try {
      if (marker.is_excluded) {
        throw new Error('제외된 마커(❌)는 상세 보고서를 생성할 수 없습니다.');
      }
      
      console.log('📄 개선된 마커 상세 HTML → PDF 생성 시작');
      
      // 개선된 HTML 마커 상세 보고서 생성
      const htmlContent = this.createMarkerDetailHTML(caseData, marker);
      
      // 임시 div 생성 및 렌더링
      const reportDiv = document.createElement('div');
      reportDiv.innerHTML = htmlContent;
      reportDiv.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        width: 800px;
        background: white;
        font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif;
        padding: 30px;
        box-sizing: border-box;
        line-height: 1.6;
      `;
      
      document.body.appendChild(reportDiv);
      
      await this.waitForFonts();
      
      const canvas = await html2canvas(reportDiv, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const imgData = canvas.toDataURL('image/png', 0.95);
      const pageWidth = this.pageWidth - (this.margin * 2);
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', this.margin, this.margin, pageWidth, imgHeight);
      
      // 페이지 번호 추가
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text('1 / 1', this.pageWidth - this.margin, this.pageHeight - 5, { align: 'right' });
      
      document.body.removeChild(reportDiv);
      
      const fileName = `마커상세_${marker.location_name}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      console.log('✅ 개선된 마커 상세 HTML → PDF 생성 완료:', fileName);
      return { success: true, fileName };
      
    } catch (error) {
      console.error('❌ 마커 HTML → PDF 생성 실패:', error);
      throw new Error(error.message || '마커 상세 보고서 생성에 실패했습니다.');
    }
  }

  /**
   * 사건 추적 보고서 HTML 템플릿 생성 (타임라인 제거 + 요약 분석 추가)
   */
  createReportHTML(caseData, validMarkers, mapElementId = null) {
    const sortedMarkers = validMarkers.sort((a, b) => new Date(a.detected_at) - new Date(b.detected_at));
    const timeRange = this.calculateTimeRange(sortedMarkers);
    const avgConfidence = validMarkers.length > 0 
      ? (validMarkers.reduce((sum, m) => sum + (m.confidence_score || 0), 0) / validMarkers.length * 100).toFixed(1)
      : 0;

    return `
      <div style="max-width: 800px; margin: 0 auto; font-family: 'Noto Sans KR', -apple-system, sans-serif;">
        <!-- 헤더 -->
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="font-size: 24px; color: #1f2937; margin: 0;">🎯 AI 리니어 사건 분석 시스템</h1>
          <h2 style="font-size: 18px; color: #4b5563; margin: 10px 0 0 0;">사건 추적 보고서</h2>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
        </div>

        <!-- 사건 정보 -->
        <div style="margin-bottom: 30px;">
          <h3 style="font-size: 16px; color: #1f2937; margin-bottom: 15px;">📋 사건 정보</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
            <thead>
              <tr style="background-color: #3b82f6;">
                <th style="padding: 12px; border: 1px solid #e5e7eb; color: white; text-align: left;">항목</th>
                <th style="padding: 12px; border: 1px solid #e5e7eb; color: white; text-align: left;">내용</th>
              </tr>
            </thead>
            <tbody>
              <tr style="background-color: #f9fafb;">
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 500;">사건번호</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${caseData.case_number || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 500;">사건명</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${caseData.title || 'N/A'}</td>
              </tr>
              <tr style="background-color: #f9fafb;">
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 500;">발생지역</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${caseData.location || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 500;">발생일시</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${this.formatDate(caseData.incident_date) || 'N/A'}</td>
              </tr>
              <tr style="background-color: #f9fafb;">
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 500;">담당자</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${caseData.created_by_name || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 500;">상태</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${caseData.status === 'active' ? '🔄 진행중' : '✅ 완료'}</td>
              </tr>
              <tr style="background-color: #f9fafb;">
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 500;">보고서 생성일</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${new Date().toLocaleString('ko-KR')}</td>
              </tr>
            </tbody>
          </table>
        </div>



        <!-- 마커 상세 정보 -->
        <div style="margin-bottom: 30px;">
          <h3 style="font-size: 16px; color: #1f2937; margin-bottom: 15px;">📍 추적 경로 상세 정보</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
            <thead>
              <tr style="background-color: #dc2626;">
                <th style="padding: 10px; border: 1px solid #e5e7eb; color: white; text-align: center;">순서</th>
                <th style="padding: 10px; border: 1px solid #e5e7eb; color: white; text-align: left;">위치</th>
                <th style="padding: 10px; border: 1px solid #e5e7eb; color: white; text-align: left;">발견시간</th>
                <th style="padding: 10px; border: 1px solid #e5e7eb; color: white; text-align: center;">신뢰도</th>
                <th style="padding: 10px; border: 1px solid #e5e7eb; color: white; text-align: center;">상태</th>
                <th style="padding: 10px; border: 1px solid #e5e7eb; color: white; text-align: left;">경찰 사견</th>
                <th style="padding: 10px; border: 1px solid #e5e7eb; color: white; text-align: center;">크롭 이미지</th>
              </tr>
            </thead>
            <tbody>
              ${sortedMarkers.map((marker, index) => `
                <tr style="background-color: ${index % 2 === 0 ? '#f9fafb' : 'white'};">
                  <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; font-weight: 600;">${index + 1}번</td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${marker.location_name || 'N/A'}</td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${this.formatDateTime(marker.detected_at) || 'N/A'}</td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${(marker.confidence_score * 100).toFixed(1)}%</td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; color: #16a34a; font-weight: 500;">✅ 확인됨</td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${marker.police_comment || '-'}</td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">
                    ${this.createMarkerImageHTML(marker)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>



        <!-- 푸터 -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>🎯 AI 리니어 사건 분석 시스템 | 생성일: ${new Date().toLocaleString('ko-KR')} | 개선된 보고서 v2.0</p>
        </div>
      </div>
    `;
  }

  /**
   * 마커 상세 보고서 HTML 템플릿 (개선된 버전)
   */
  createMarkerDetailHTML(caseData, marker) {
    return `
      <div style="max-width: 800px; margin: 0 auto; font-family: 'Noto Sans KR', -apple-system, sans-serif;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="font-size: 24px; color: #1f2937; margin: 0;">🎯 AI 리니어 사건 분석 시스템</h1>
          <h2 style="font-size: 18px; color: #4b5563; margin: 10px 0 0 0;">마커 상세 보고서 - ${marker.location_name}</h2>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="font-size: 16px; color: #1f2937; margin-bottom: 15px;">📍 마커 정보</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
            <thead>
              <tr style="background-color: #3b82f6;">
                <th style="padding: 12px; border: 1px solid #e5e7eb; color: white; text-align: left;">항목</th>
                <th style="padding: 12px; border: 1px solid #e5e7eb; color: white; text-align: left;">내용</th>
              </tr>
            </thead>
            <tbody>
              <tr style="background-color: #f9fafb;">
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 500;">위치명</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 600;">${marker.location_name || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 500;">발견시간</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${this.formatDateTime(marker.detected_at) || 'N/A'}</td>
              </tr>
              <tr style="background-color: #f9fafb;">
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 500;">신뢰도</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 600; color: #7c3aed;">${(marker.confidence_score * 100).toFixed(1)}%</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 500;">상태</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 600; color: ${marker.is_excluded ? '#dc2626' : '#16a34a'};">${marker.is_excluded ? '❌ 제외됨' : '✅ 확인됨'}</td>
              </tr>
              <tr style="background-color: #f9fafb;">
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 500;">AI 생성 여부</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 600; color: ${marker.ai_generated ? '#1d4ed8' : '#374151'};">${marker.ai_generated ? '🤖 AI 분석' : '👮 수동 등록'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 500;">경찰 사견</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-style: ${marker.police_comment ? 'normal' : 'italic'}; color: ${marker.police_comment ? '#374151' : '#9ca3af'};">${marker.police_comment || '사견 없음'}</td>
              </tr>
              <tr style="background-color: #f9fafb;">
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 500;">좌표</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-family: 'Courier New', monospace;">${marker.latitude && marker.longitude ? `${marker.latitude}, ${marker.longitude}` : 'N/A'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 📸 크롭 이미지 섹션 추가 -->
        ${this.createMarkerImageSectionHTML(marker)}

        <!-- 📊 마커 분석 요약 추가 -->
        <div style="margin-bottom: 30px;">
          <h3 style="font-size: 16px; color: #1f2937; margin-bottom: 15px;">📊 마커 분석 요약</h3>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="font-size: 14px; line-height: 1.8;">
              <div style="margin-bottom: 12px;">
                <strong style="color: #1f2937;">🎯 신뢰도 평가:</strong>
                <span style="color: #6b7280; margin-left: 10px;">
                  ${marker.confidence_score >= 0.8 ? '매우 높은 신뢰도 (80% 이상)' :
                    marker.confidence_score >= 0.6 ? '높은 신뢰도 (60-79%)' :
                    marker.confidence_score >= 0.4 ? '보통 신뢰도 (40-59%)' :
                    '낮은 신뢰도 (40% 미만)'}
                </span>
              </div>
              <div style="margin-bottom: 12px;">
                <strong style="color: #1f2937;">🔍 발견 방식:</strong>
                <span style="color: #6b7280; margin-left: 10px;">
                  ${marker.ai_generated ? 
                    'AI 자동 분석을 통해 발견된 마커입니다' : 
                    '경찰관이 수동으로 등록한 마커입니다'}
                </span>
              </div>
              <div>
                <strong style="color: #1f2937;">📝 검토 상태:</strong>
                <span style="color: #6b7280; margin-left: 10px;">
                  ${marker.is_excluded ? 
                    '검토 결과 제외된 마커입니다' : 
                    '검토 완료되어 추적 경로에 포함된 마커입니다'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>🎯 AI 리니어 사건 분석 시스템 | 생성일: ${new Date().toLocaleString('ko-KR')} | 마커 상세 보고서 v2.0</p>
        </div>
      </div>
    `;
  }

  /**
   * 개선된 폰트 로드 대기
   */
  async waitForFonts() {
    if ('fonts' in document) {
      try {
        await document.fonts.ready;
        // 추가 대기 시간으로 안정성 확보
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.warn('폰트 로딩 중 오류:', error);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } else {
      // 폰트 API를 지원하지 않는 브라우저용 대기
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  /**
   * 시간 범위 계산
   */
  calculateTimeRange(markers) {
    if (markers.length === 0) return {};
    
    const sortedMarkers = markers.sort((a, b) => new Date(a.detected_at) - new Date(b.detected_at));
    const start = sortedMarkers[0].detected_at;
    const end = sortedMarkers[sortedMarkers.length - 1].detected_at;
    
    const startTime = new Date(start);
    const endTime = new Date(end);
    const diffMs = endTime - startTime;
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
      start: this.formatDateTime(start),
      end: this.formatDateTime(end),
      duration: `${hours}시간 ${minutes}분`
    };
  }

  /**
   * 날짜 포맷팅
   */
  formatDate(dateString) {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('ko-KR');
    } catch (error) {
      return 'N/A';
    }
  }

  /**
   * 날짜+시간 포맷팅
   */
  formatDateTime(dateString) {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      return date.toLocaleString('ko-KR');
    } catch (error) {
      return 'N/A';
    }
  }

  /**
   * 마커 이미지 HTML 생성 (테이블용 - 작은 썸네일)
   */
  createMarkerImageHTML(marker) {
    const imageUrl = this.getMarkerImageUrl(marker);
    
    if (!imageUrl) {
      return '<span style="color: #9ca3af; font-style: italic; font-size: 11px;">이미지 없음</span>';
    }

    return `
      <div style="text-align: center;">
        <img 
          src="${imageUrl}" 
          alt="마커 ${marker.location_name}" 
          style="
            width: 60px; 
            height: 60px; 
            object-fit: cover; 
            border-radius: 6px; 
            border: 2px solid #e5e7eb;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          "
          onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
        />
        <div style="display: none; color: #9ca3af; font-size: 10px; margin-top: 2px;">로딩 실패</div>
      </div>
    `;
  }

  /**
   * 마커 이미지 섹션 HTML 생성 (상세 보고서용 - 큰 이미지)
   */
  createMarkerImageSectionHTML(marker) {
    const imageUrl = this.getMarkerImageUrl(marker);
    
    if (!imageUrl) {
      return `
        <div style="margin-bottom: 30px;">
          <h3 style="font-size: 16px; color: #1f2937; margin-bottom: 15px;">📸 크롭 이미지</h3>
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center;">
            <span style="color: #9ca3af; font-style: italic;">이 마커에는 크롭된 이미지가 없습니다</span>
          </div>
        </div>
      `;
    }

    return `
      <div style="margin-bottom: 30px;">
        <h3 style="font-size: 16px; color: #1f2937; margin-bottom: 15px;">📸 크롭 이미지</h3>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center;">
          <img 
            src="${imageUrl}" 
            alt="마커 ${marker.location_name} 크롭 이미지" 
            style="
              max-width: 300px; 
              max-height: 300px; 
              width: auto; 
              height: auto; 
              object-fit: contain; 
              border-radius: 8px; 
              border: 2px solid #d1d5db;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            "
            onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
          />
          <div style="display: none; color: #9ca3af; font-style: italic; padding: 40px;">
            이미지를 로드할 수 없습니다
          </div>
          <p style="margin-top: 10px; font-size: 12px; color: #6b7280;">
            ${marker.ai_generated ? '🤖 AI 분석으로' : '👮 수동 등록으로'} 발견된 ${marker.location_name} 위치의 크롭 이미지
          </p>
        </div>
      </div>
    `;
  }

  /**
   * 마커 이미지 URL 가져오기
   */
  getMarkerImageUrl(marker) {
    // 가능한 이미지 경로들을 확인 (마커 데이터 구조에 따라 조정 필요)
    const possiblePaths = [
      marker.image_url,           // 직접적인 이미지 URL
      marker.cropped_image,       // 크롭된 이미지 경로
      marker.image_path,          // 이미지 파일 경로
      marker.suspect_image,       // 용의자 이미지
      marker.detection_image,     // 탐지 이미지
    ];

    for (const path of possiblePaths) {
      if (path && typeof path === 'string' && path.trim() !== '') {
        // 상대 경로인 경우 절대 경로로 변환
        if (path.startsWith('/media/') || path.startsWith('media/')) {
          return `${window.location.origin}/${path.replace(/^\//, '')}`;
        }
        // 이미 완전한 URL인 경우
        if (path.startsWith('http://') || path.startsWith('https://')) {
          return path;
        }
        // shared_storage 경로인 경우
        if (path.includes('shared_storage/')) {
          return `${window.location.origin}/${path}`;
        }
      }
    }

    return null;
  }
  formatTime(dateString) {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'N/A';
    }
  }
}

export const htmlToPdfService = new HTMLToPDFService();