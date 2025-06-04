# apps/cases/serializers.py 파일을 생성하고 다음 내용 입력:

from rest_framework import serializers
from .models import Case, Suspect, CCTVMarker
from apps.authentication.serializers import PoliceUserSerializer

class SuspectSerializer(serializers.ModelSerializer):
    """용의자 시리얼라이저"""
    
    class Meta:
        model = Suspect
        fields = [
            'id', 'case', 'name', 'age_estimate', 'height_estimate',
            'clothing_description', 'reference_image_url', 'ai_person_id',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class CCTVMarkerSerializer(serializers.ModelSerializer):
    """CCTV 마커 시리얼라이저"""
    
    suspect_name = serializers.CharField(source='suspect.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.display_name', read_only=True)
    confidence_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = CCTVMarker
        fields = [
            'id', 'case', 'suspect', 'suspect_name', 'location_name',
            'latitude', 'longitude', 'detected_at', 'confidence_score',
            'confidence_percentage', 'crop_image_url', 'police_comment',
            'is_confirmed', 'is_excluded', 'sequence_order',  # ✅ 순서 필드 추가
            'analysis_id', 'created_by', 'created_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'created_by']
    
    def get_confidence_percentage(self, obj):
        """신뢰도를 퍼센트로 반환"""
        return f"{obj.confidence_score * 100:.1f}%"

class CaseDetailSerializer(serializers.ModelSerializer):
    """사건 상세 시리얼라이저 (용의자와 마커 포함)"""
    
    suspects = SuspectSerializer(many=True, read_only=True)
    cctv_markers = CCTVMarkerSerializer(many=True, read_only=True)
    created_by_info = PoliceUserSerializer(source='created_by', read_only=True)
    suspect_count = serializers.SerializerMethodField()
    marker_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Case
        fields = [
            'id', 'case_number', 'title', 'description', 'incident_date',
            'location', 'latitude', 'longitude', 'status',
            'created_by', 'created_by_info', 'created_at', 'updated_at',
            'suspects', 'cctv_markers', 'suspect_count', 'marker_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']
    
    def get_suspect_count(self, obj):
        """용의자 수 반환"""
        return obj.suspects.count()
    
    def get_marker_count(self, obj):
        """마커 수 반환"""
        return obj.cctv_markers.count()

class CaseListSerializer(serializers.ModelSerializer):
    """사건 목록 시리얼라이저 (간단한 정보만)"""
    
    created_by_name = serializers.CharField(source='created_by.display_name', read_only=True)
    suspect_count = serializers.SerializerMethodField()
    marker_count = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Case
        fields = [
            'id', 'case_number', 'title', 'incident_date', 'location',
            'status', 'status_display', 'created_by_name', 'created_at',
            'suspect_count', 'marker_count'
        ]
    
    def get_suspect_count(self, obj):
        return obj.suspects.count()
    
    def get_marker_count(self, obj):
        return obj.cctv_markers.count()

class CaseCreateSerializer(serializers.ModelSerializer):
    """사건 생성 시리얼라이저"""
    
    class Meta:
        model = Case
        fields = [
            'case_number', 'title', 'description', 'incident_date',
            'location', 'latitude', 'longitude', 'status'
        ]
    
    def create(self, validated_data):
        # created_by는 뷰에서 설정
        return Case.objects.create(**validated_data)