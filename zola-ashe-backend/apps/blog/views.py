"""Blog : lecture publique (articles publiés) + CRUD admin."""
from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from apps.admin_api.permissions import IsAdmin

from .models import Article
from .serializers import AdminArticleSerializer, ArticleDetailSerializer, ArticleListSerializer


class PublicArticleViewSet(viewsets.ReadOnlyModelViewSet):
    """Liste et détail des articles publiés (accès libre). Lookup par slug."""
    permission_classes = [AllowAny]
    authentication_classes = []
    lookup_field = "slug"
    queryset = Article.objects.filter(published=True)

    def get_serializer_class(self):
        return ArticleDetailSerializer if self.action == "retrieve" else ArticleListSerializer


class AdminArticleViewSet(viewsets.ModelViewSet):
    """CRUD éditorial des articles (réservé admin)."""
    permission_classes = [IsAdmin]
    serializer_class = AdminArticleSerializer
    queryset = Article.objects.all()
