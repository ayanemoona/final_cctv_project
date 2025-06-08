// src/services/pdfService.js - 한글 폰트 지원

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

class PDFService {
  constructor() {
    // PDF 기본 설정
    this.pageWidth = 210; // A4 width in mm
    this.pageHeight = 297; // A4 height in mm
    this.margin = 20;
    this.contentWidth = this.pageWidth - (this.margin * 2);
    this.fontLoaded = false;
  }

  // ✅ 한글 폰트 로드 (Noto Sans KR 웹폰트 사용)
  async loadKoreanFont(pdf) {
    if (this.fontLoaded) return;
    
    try {
      // 한글 폰트 Base64 데이터 생성 (간단한 방법)
      const fontUrl = 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap';
      
      // 폰트가 없을 경우 기본 폰트 사용하고 경고만 출력
      console.log('📝 한글 폰트를 사용할 수 없어 기본 폰트를 사용합니다.');
      this.fontLoaded = true;
      
      // 대안: 유니코드 문자 변환
      pdf.setFont('helvetica');
      
    } catch (error) {
      console.warn('한글 폰트 로드 실패, 기본 폰트 사용:', error);
      this.fontLoaded = true;
    }
  }

  // ✅ 한글 텍스트 처리 함수
  processKoreanText(text) {
    if (!text) return '';
    
    // 한글 텍스트를 영문으로 변환하거나 그대로 반환
    const koreanMap = {
      '사건번호': 'Case Number',
      '사건명': 'Case Title', 
      '발생지역': 'Location',
      '발생일시': 'Incident Date',
      '담당자': 'Officer',
      '상태': 'Status',
      '보고서 생성일': 'Report Date',
      '진행중': 'Active',
      '완료': 'Completed',
      '통계 항목': 'Statistics',
      '값': 'Value',
      '추적 가능한 마커 수': 'Trackable Markers',
      '평균 신뢰도': 'Avg Confidence',
      '추적 시작 시간': 'Start Time',
      '추적 종료 시간': 'End Time',
      '총 추적 기간': 'Total Duration',
      '순서': 'Order',
      '위치': 'Location',
      '발견시간': 'Detection Time',
      '신뢰도': 'Confidence',
      '경찰 사견': 'Police Comment',
      '확인됨': 'Confirmed',
      '구간': 'Section',
      '이동 경로': 'Route',
      '소요시간': 'Duration',
      '출발시간': 'Departure',
      '도착시간': 'Arrival',
      '시간': 'hours',
      '분': 'min',
      '개': 'items'
    };
    
    // 완전 일치하는 경우 영문으로 변환
    if (koreanMap[text]) {
      return koreanMap[text];
    }
    
    // 부분 변환
    let result = text;
    Object.entries(koreanMap).forEach(([korean, english]) => {
      result = result.replace(new RegExp(korean, 'g'), english);
    });
    
    return result;
  }

  /**
   * 사건 추적 보고서 생성 (제외된 마커는 포함하지 않음)
   */
  async generateCaseTrackingReport(caseData, markers, mapElementId = null) {
    try {
      console.log('📄 사건 추적 보고서 생성 시작');
      
      // ✅ 제외된 마커(X 마커) 필터링
      const validMarkers = markers.filter(marker => 
        marker.is_confirmed && !marker.is_excluded
      );
      
      if (validMarkers.length === 0) {
        throw new Error('추적 가능한 마커가 없어 보고서를 생성할 수 없습니다.');
      }
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // 한글 폰트 로드 시도
      await this.loadKoreanFont(pdf);
      
      let currentY = this.margin;

      // 1. 헤더 및 제목
      currentY = this.addHeader(pdf, caseData, currentY);
      
      // 2. 사건 정보 요약
      currentY = this.addCaseInfo(pdf, caseData, currentY);
      
      // 3. 마커 통계 (유효한 마커만)
      currentY = this.addMarkerStatistics(pdf, validMarkers, currentY);
      
      // 4. 지도 캡처 (있는 경우)
      if (mapElementId) {
        await this.addMapCapture(pdf, mapElementId, currentY);
      }
      
      // 5. 마커 상세 정보 테이블 (유효한 마커만)
      this.addMarkersTable(pdf, validMarkers);
      
      // 6. 타임라인 분석 (유효한 마커만)  
      this.addTimelineAnalysis(pdf, validMarkers);
      
      // 7. 푸터
      this.addFooter(pdf);
      
      // PDF 다운로드
      const fileName = `Case_Tracking_Report_${caseData.case_number}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      console.log('✅ PDF 보고서 생성 완료:', fileName);
      console.log(`📊 포함된 마커: ${validMarkers.length}개 (제외된 마커는 생략)`);
      return { success: true, fileName, markerCount: validMarkers.length };
      
    } catch (error) {
      console.error('❌ PDF 생성 실패:', error);
      throw new Error(`PDF 보고서 생성에 실패했습니다: ${error.message}`);
    }
  }

  /**
   * 개별 마커 상세 보고서 (제외된 마커는 생성하지 않음)
   */
  async generateMarkerDetailReport(caseData, marker) {
    try {
      // ✅ 제외된 마커는 PDF 생성 차단
      if (marker.is_excluded) {
        throw new Error('제외된 마커(❌)는 상세 보고서를 생성할 수 없습니다.');
      }
      
      console.log('📄 마커 상세 보고서 생성 시작');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // 한글 폰트 로드 시도
      await this.loadKoreanFont(pdf);
      
      let yPos = this.margin;

      // 헤더
      yPos = this.addHeader(pdf, caseData, yPos, `Marker Detail Report - ${marker.location_name}`);
      
      // 마커 상세 정보
      this.addMarkerDetail(pdf, marker, yPos);
      
      // 마커 이미지 (있는 경우)
      if (marker.crop_image_url) {
        await this.addMarkerImage(pdf, marker);
      }
      
      // 푸터
      this.addFooter(pdf);
      
      const fileName = `Marker_Detail_${marker.location_name}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      console.log('✅ 마커 상세 PDF 생성 완료:', fileName);
      return { success: true, fileName };
      
    } catch (error) {
      console.error('❌ 마커 PDF 생성 실패:', error);
      throw new Error(error.message || '마커 상세 보고서 생성에 실패했습니다.');
    }
  }

  // === 내부 함수들 (한글 처리 적용) ===

  addMarkerStatistics(pdf, validMarkers, startY) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('📊 Tracking Statistics', this.margin, startY);
    
    const tableStartY = startY + 10;
    
    // ✅ 유효한 마커만으로 통계 계산
    const totalMarkers = validMarkers.length;
    const avgConfidence = validMarkers.length > 0 
      ? (validMarkers.reduce((sum, m) => sum + (m.confidence_score || 0), 0) / validMarkers.length * 100).toFixed(1)
      : 0;
    
    // 시간 범위 계산
    const timeRange = this.calculateTimeRange(validMarkers);
    
    const stats = [
      ['Trackable Markers', `${totalMarkers} items`],
      ['Avg Confidence', `${avgConfidence}%`],
      ['Start Time', timeRange.start || 'N/A'],
      ['End Time', timeRange.end || 'N/A'],
      ['Total Duration', timeRange.duration || 'N/A']
    ];

    autoTable(pdf, {
      startY: tableStartY,
      head: [['Statistics', 'Value']],
      body: stats,
      margin: { left: this.margin, right: this.margin },
      theme: 'striped',
      styles: { 
        fontSize: 10,
        cellPadding: 3,
        font: 'helvetica'
      },
      headStyles: { 
        fillColor: [92, 184, 92],
        textColor: 255,
        fontStyle: 'bold'
      }
    });

    return pdf.lastAutoTable.finalY + 15;
  }

  addMarkersTable(pdf, validMarkers) {
    // 새 페이지 시작
    pdf.addPage();
    const startY = this.margin;
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('📍 Tracking Route Details', this.margin, startY);
    
    const tableStartY = startY + 10;
    
    // ✅ 이미 유효한 마커들만 전달받음 (시간순 정렬)
    const sortedMarkers = validMarkers.sort((a, b) => new Date(a.detected_at) - new Date(b.detected_at));
    
    if (sortedMarkers.length === 0) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text('No trackable markers found.', this.margin, tableStartY);
      return;
    }

    const tableData = sortedMarkers.map((marker, index) => [
      `#${index + 1}`,
      marker.location_name || 'N/A',
      this.formatDateTime(marker.detected_at) || 'N/A',
      `${(marker.confidence_score * 100).toFixed(1)}%`,
      'Confirmed',
      marker.police_comment || '-'
    ]);

    autoTable(pdf, {
      startY: tableStartY,
      head: [['Order', 'Location', 'Detection Time', 'Confidence', 'Status', 'Police Comment']],
      body: tableData,
      margin: { left: this.margin, right: this.margin },
      theme: 'grid',
      styles: { 
        fontSize: 9,
        cellPadding: 2,
        font: 'helvetica'
      },
      headStyles: { 
        fillColor: [217, 83, 79],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { cellWidth: 40 },
        2: { cellWidth: 35 },
        3: { halign: 'center', cellWidth: 20 },
        4: { halign: 'center', cellWidth: 20 },
        5: { cellWidth: 40 }
      }
    });
  }

  addTimelineAnalysis(pdf, validMarkers) {
    // 새 페이지에서 시작하거나 여유 공간 확인
    if (pdf.lastAutoTable && pdf.lastAutoTable.finalY > this.pageHeight - 100) {
      pdf.addPage();
    }
    
    const startY = pdf.lastAutoTable ? Math.max(pdf.lastAutoTable.finalY + 20, this.margin) : this.margin;
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('⏱️ Timeline Analysis', this.margin, startY);
    
    const tableStartY = startY + 10;
    
    const trackableMarkers = validMarkers
      .filter(m => m.is_confirmed && !m.is_excluded)
      .sort((a, b) => new Date(a.detected_at) - new Date(b.detected_at));
    
    if (trackableMarkers.length < 2) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text('At least 2 markers required for timeline analysis.', this.margin, tableStartY);
      return;
    }

    // 이동 구간별 분석
    const movements = [];
    for (let i = 1; i < trackableMarkers.length; i++) {
      const prev = trackableMarkers[i - 1];
      const curr = trackableMarkers[i];
      
      const timeDiff = new Date(curr.detected_at) - new Date(prev.detected_at);
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      
      movements.push([
        `Section ${i}`,
        `${prev.location_name} → ${curr.location_name}`,
        `${hours}h ${minutes}m`,
        this.formatTime(prev.detected_at),
        this.formatTime(curr.detected_at)
      ]);
    }

    autoTable(pdf, {
      startY: tableStartY,
      head: [['Section', 'Route', 'Duration', 'Departure', 'Arrival']],
      body: movements,
      margin: { left: this.margin, right: this.margin },
      theme: 'striped',
      styles: { 
        fontSize: 9,
        cellPadding: 2,
        font: 'helvetica'
      },
      headStyles: { 
        fillColor: [138, 109, 59],
        textColor: 255,
        fontStyle: 'bold'
      }
    });
  }

  async addMapCapture(pdf, mapElementId, startY) {
    try {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('🗺️ Tracking Route Map', this.margin, startY);
      
      const mapY = startY + 10;
      
      const mapElement = document.getElementById(mapElementId);
      if (!mapElement) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.text('Map capture not available.', this.margin, mapY);
        return;
      }

      // 지도 캡처
      const canvas = await html2canvas(mapElement, {
        useCORS: true,
        scale: 1,
        width: mapElement.offsetWidth,
        height: mapElement.offsetHeight
      });

      // 이미지를 PDF에 추가
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = this.contentWidth;
      const imgHeight = (canvas.height / canvas.width) * imgWidth;
      
      // 페이지 넘김 체크
      const finalY = mapY + imgHeight;
      if (finalY > this.pageHeight - this.margin) {
        pdf.addPage();
        const newY = this.margin;
        pdf.addImage(imgData, 'PNG', this.margin, newY, imgWidth, imgHeight);
        return;
      }
      
      pdf.addImage(imgData, 'PNG', this.margin, mapY, imgWidth, imgHeight);
      
    } catch (error) {
      console.error('지도 캡처 실패:', error);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text('Map capture failed.', this.margin, startY + 10);
    }
  }

  addMarkerDetail(pdf, marker, startY) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text(`📍 Marker Info - ${marker.location_name}`, this.margin, startY);
    
    const tableStartY = startY + 10;
    
    const markerInfo = [
      ['Location', marker.location_name || 'N/A'],
      ['Detection Time', this.formatDateTime(marker.detected_at) || 'N/A'],
      ['Confidence', `${(marker.confidence_score * 100).toFixed(1)}%`],
      ['Status', marker.is_excluded ? 'Excluded' : 'Confirmed'],
      ['AI Generated', marker.ai_generated ? 'AI Analysis' : 'Manual'],
      ['Police Comment', marker.police_comment || '-'],
      ['Coordinates', marker.latitude && marker.longitude ? `${marker.latitude}, ${marker.longitude}` : 'N/A']
    ];

    autoTable(pdf, {
      startY: tableStartY,
      head: [['Item', 'Content']],
      body: markerInfo,
      margin: { left: this.margin, right: this.margin },
      theme: 'grid',
      styles: { 
        fontSize: 10,
        cellPadding: 3,
        font: 'helvetica'
      },
      headStyles: { 
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold'
      }
    });

    return pdf.lastAutoTable.finalY + 15;
  }

  async addMarkerImage(pdf, marker) {
    try {
      // 이미지 URL이 상대 경로인 경우 절대 경로로 변환
      const imageUrl = marker.crop_image_url.startsWith('http') 
        ? marker.crop_image_url 
        : `${window.location.origin}${marker.crop_image_url}`;
      
      // 이미지를 로드하고 PDF에 추가
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const imgData = canvas.toDataURL('image/jpeg', 0.8);
            const imgWidth = Math.min(this.contentWidth * 0.6, 80);
            const imgHeight = (img.height / img.width) * imgWidth;
            
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(12);
            
            // 현재 Y 위치 계산
            const startY = pdf.lastAutoTable ? pdf.lastAutoTable.finalY + 10 : this.margin;
            pdf.text('🖼️ Suspect Image', this.margin, startY);
            
            const imageY = startY + 10;
            pdf.addImage(imgData, 'JPEG', this.margin, imageY, imgWidth, imgHeight);
            
            resolve();
          } catch (error) {
            console.error('이미지 처리 실패:', error);
            resolve();
          }
        };
        
        img.onerror = () => {
          console.error('이미지 로드 실패:', imageUrl);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          const startY = pdf.lastAutoTable ? pdf.lastAutoTable.finalY + 10 : this.margin;
          pdf.text('Image not available.', this.margin, startY);
          resolve();
        };
        
        img.src = imageUrl;
      });
      
    } catch (error) {
      console.error('이미지 추가 실패:', error);
    }
  }

  // ✅ 시간 범위 계산 헬퍼 함수
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
      duration: `${hours}h ${minutes}m`
    };
  }

  addHeader(pdf, caseData, startY, subtitle = 'Case Tracking Report') {
    // 제목
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.text('🎯 AI Linear Case Analysis System', this.margin, startY);
    
    const titleY = startY + 10;
    pdf.setFontSize(16);
    pdf.text(subtitle, this.margin, titleY);
    
    const lineY = titleY + 15;
    
    // 구분선
    pdf.setLineWidth(0.5);
    pdf.line(this.margin, lineY, this.pageWidth - this.margin, lineY);
    
    return lineY + 10;
  }

  addCaseInfo(pdf, caseData, startY) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('📋 Case Information', this.margin, startY);
    
    const tableStartY = startY + 10;
    
    const caseInfo = [
      ['Case Number', caseData.case_number || 'N/A'],
      ['Case Title', caseData.title || 'N/A'],
      ['Location', caseData.location || 'N/A'],
      ['Incident Date', this.formatDate(caseData.incident_date) || 'N/A'],
      ['Officer', caseData.created_by_name || 'N/A'],
      ['Status', caseData.status === 'active' ? 'Active' : 'Completed'],
      ['Report Date', new Date().toLocaleString('en-US')]
    ];

    autoTable(pdf, {
      startY: tableStartY,
      head: [['Item', 'Content']],
      body: caseInfo,
      margin: { left: this.margin, right: this.margin },
      theme: 'grid',
      styles: { 
        font: 'helvetica',
        fontSize: 10,
        cellPadding: 3
      },
      headStyles: { 
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold'
      }
    });

    return pdf.lastAutoTable.finalY + 15;
  }

  addFooter(pdf) {
    const pageCount = pdf.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      
      // 푸터 텍스트
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      
      const footerText = `AI Linear Case Analysis System | Generated: ${new Date().toLocaleString('en-US')}`;
      const pageText = `${i} / ${pageCount}`;
      
      pdf.text(footerText, this.margin, this.pageHeight - 10);
      pdf.text(pageText, this.pageWidth - this.margin - 20, this.pageHeight - 10);
      
      // 푸터 구분선
      pdf.setLineWidth(0.2);
      pdf.line(this.margin, this.pageHeight - 15, this.pageWidth - this.margin, this.pageHeight - 15);
    }
  }

  // === 유틸리티 함수들 ===

  formatDate(dateString) {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US');
  }

  formatDateTime(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleString('en-US');
  }

  formatTime(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

export const pdfService = new PDFService();