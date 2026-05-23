"""Contenus pédagogiques — Single Table Inheritance (CDC §2.3, §2.4, §2.5).

Stratégie : une seule table `contents` avec un discriminateur `content_type`
(VIDEO / PDF / AUDIO). Les colonnes non applicables restent NULL ;
l'homogénéité est garantie au niveau applicatif (RG-15).
"""
from django.db import models


class Category(models.TextChoices):
    """Catégorie de catalogue (rangement, sans effet d'accès)."""
    LIVRE = "LIVRE", "Livre"
    FORMATION = "FORMATION", "Formation"
    LIBRE = "LIBRE", "Accès libre"


class ContentType(models.TextChoices):
    VIDEO = "VIDEO", "Vidéo"
    PDF = "PDF", "PDF"
    AUDIO = "AUDIO", "Audio"


class Collection(models.Model):
    """Regroupement de contenus de même type au sein d'une catégorie (agrégation)."""
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    content_type = models.CharField(max_length=10, choices=ContentType.choices)
    category = models.CharField(max_length=10, choices=Category.choices, default=Category.FORMATION)
    order = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "collections"
        ordering = ["order"]


class Content(models.Model):
    """Table unique pour Video / PDF / Audio (discriminateur `content_type`)."""
    content_type = models.CharField(max_length=10, choices=ContentType.choices)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=10, choices=Category.choices,
                                default=Category.FORMATION)  # rangement catalogue
    # Types d'abonnement qui ouvrent l'accès (RG-22 généralisé) : le membre y a
    # accès s'il détient un abonnement actif de l'UN de ces types. Liste vide =
    # contenu libre (tout membre non bloqué). Codes de billing.SubscriptionType.
    access_subscription_types = models.JSONField(default=list, blank=True)
    order = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=False)  # brouillon par défaut (CDC §5.4)
    collection = models.ForeignKey(
        Collection, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="contents",  # RG-21 : supprimer la collection ne supprime pas les contenus
    )
    created_at = models.DateTimeField(auto_now_add=True)

    # --- VIDEO ---
    youtube_url = models.URLField(blank=True)
    thumbnail_url = models.URLField(blank=True)            # miniature externe (optionnel, legacy)
    thumbnail_key = models.CharField(max_length=512, blank=True)  # miniature stockée MinIO (servie signée)
    quiz_url = models.URLField(blank=True)
    quiz_threshold = models.PositiveIntegerField(default=15)  # /20 (CDC §4.4)
    quiz_active = models.BooleanField(default=True)

    # --- PDF ---
    bucket_key = models.CharField(max_length=512, blank=True)  # clé R2 (jamais exposée)
    nb_pages = models.PositiveIntegerField(null=True, blank=True)

    # --- AUDIO / PDF commun ---
    duration_sec = models.PositiveIntegerField(null=True, blank=True)
    size_mo = models.FloatField(null=True, blank=True)
    audio_format = models.CharField(max_length=10, blank=True)

    class Meta:
        db_table = "contents"
        ordering = ["category", "order"]
        indexes = [models.Index(fields=["category", "content_type", "active"])]


class QuizResult(models.Model):
    """Progression d'un membre sur un module vidéo (CDC §4.4, RG-23 à RG-28)."""
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="quiz_results")
    content = models.ForeignKey(Content, on_delete=models.CASCADE, related_name="quiz_results")
    score = models.PositiveIntegerField(default=0)
    attempts = models.PositiveIntegerField(default=0)
    validated = models.BooleanField(default=False)
    validated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "quiz_results"
        unique_together = ("user", "content")
