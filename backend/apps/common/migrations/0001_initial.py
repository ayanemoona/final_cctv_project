# Generated by Django 4.2.7 on 2025-06-03 04:05

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='QuickInput',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('field_name', models.CharField(choices=[('location', '위치'), ('location_name', 'CCTV 위치명'), ('title', '사건명'), ('description', '사건개요'), ('case_number', '사건번호'), ('department', '부서'), ('rank', '계급')], max_length=50, verbose_name='필드명')),
                ('value', models.CharField(max_length=200, verbose_name='값')),
                ('usage_count', models.IntegerField(default=1, verbose_name='사용 횟수')),
                ('last_used', models.DateTimeField(auto_now=True, verbose_name='마지막 사용일')),
            ],
            options={
                'verbose_name': '빠른 입력',
                'verbose_name_plural': '빠른 입력 데이터',
                'ordering': ['-usage_count', '-last_used'],
                'unique_together': {('field_name', 'value')},
            },
        ),
    ]
