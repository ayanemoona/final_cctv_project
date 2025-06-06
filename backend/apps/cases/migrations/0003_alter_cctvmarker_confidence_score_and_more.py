# Generated by Django 4.2.7 on 2025-06-03 14:32

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('cases', '0002_alter_cctvmarker_latitude_alter_cctvmarker_longitude'),
    ]

    operations = [
        migrations.AlterField(
            model_name='cctvmarker',
            name='confidence_score',
            field=models.FloatField(default=1.0, verbose_name='신뢰도'),
        ),
        migrations.AlterField(
            model_name='cctvmarker',
            name='created_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL, verbose_name='등록자'),
        ),
        migrations.AlterField(
            model_name='cctvmarker',
            name='crop_image_url',
            field=models.URLField(blank=True, null=True, verbose_name='크롭 이미지 URL'),
        ),
        migrations.AlterField(
            model_name='cctvmarker',
            name='suspect',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='cctv_markers', to='cases.suspect', verbose_name='용의자'),
        ),
    ]
