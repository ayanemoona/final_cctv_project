# apps/cases/apps.py 파일 수정:

from django.apps import AppConfig

class CasesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.cases'
    verbose_name = '사건 관리'