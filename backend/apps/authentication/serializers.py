# backend/apps/authentication/serializers.py

from rest_framework import serializers
from .models import PoliceUser

class PoliceUserSerializer(serializers.ModelSerializer):
    """경찰 사용자 시리얼라이저"""
    
    class Meta:
        model = PoliceUser
        fields = [
            'id', 'username', 'first_name', 'last_name', 
            'email', 'badge_number', 'department', 'rank', 
            'phone', 'is_active', 'date_joined'
        ]
        read_only_fields = ['id', 'date_joined']

class PoliceUserCreateSerializer(serializers.ModelSerializer):
    """경찰 사용자 생성용 시리얼라이저"""
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = PoliceUser
        fields = [
            'username', 'password', 'password_confirm',
            'first_name', 'last_name', 'email', 
            'badge_number', 'department', 'rank', 'phone'
        ]
    
    def validate(self, attrs):
        """비밀번호 확인 검증"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("비밀번호가 일치하지 않습니다.")
        return attrs
    
    def create(self, validated_data):
        """사용자 생성"""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        user = PoliceUser.objects.create_user(
            password=password,
            **validated_data
        )
        return user