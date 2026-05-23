from django.contrib import admin

from .models import Collection, Content, QuizResult


@admin.register(Collection)
class CollectionAdmin(admin.ModelAdmin):
    list_display = ("title", "content_type", "category", "order", "active")
    list_filter = ("content_type", "category", "active")
    search_fields = ("title",)


@admin.register(Content)
class ContentAdmin(admin.ModelAdmin):
    list_display = ("title", "content_type", "category", "collection", "active", "order", "created_at")
    list_filter = ("content_type", "category", "active")
    search_fields = ("title", "description")
    list_editable = ("active", "order")
    readonly_fields = ("created_at",)


@admin.register(QuizResult)
class QuizResultAdmin(admin.ModelAdmin):
    list_display = ("user", "content", "score", "attempts", "validated", "validated_at")
    list_filter = ("validated",)
    search_fields = ("user__email", "content__title")
    readonly_fields = ("validated_at",)
