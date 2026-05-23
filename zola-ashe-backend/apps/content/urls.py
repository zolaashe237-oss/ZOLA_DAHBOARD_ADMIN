"""Routes du contenu (montées sous /api/) → /api/content/ et /api/collections/."""
from rest_framework.routers import DefaultRouter

from .views import CollectionViewSet, ContentViewSet

router = DefaultRouter()
router.register("content", ContentViewSet, basename="content")
router.register("collections", CollectionViewSet, basename="collection")

urlpatterns = router.urls
