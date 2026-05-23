"""Vues billing : tarifs publics, initiation de paiement, historique, webhook Swinmo."""
import json

from django.conf import settings
from rest_framework import generics, status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import swinmo
from .models import Payment, Subscription
from .serializers import (
    InitiatePaymentSerializer,
    PaymentSerializer,
    SubscriptionSerializer,
)
from .services import initiate_payment, process_webhook_event


class SubscriptionTypesView(APIView):
    """Tarifs publics (vitrine) — aucun secret exposé."""
    permission_classes = [AllowAny]

    def get(self, _request):
        return Response([
            {"kind": "INSCRIPTION", "label": "Droit d'inscription", "amount": settings.PRICE_INSCRIPTION},
            {"kind": "COTISATION", "label": "Cotisation mensuelle", "amount": settings.PRICE_COTISATION},
            {"kind": "DON", "label": "Don volontaire", "amount": 0},
        ])


class InitiatePaymentView(generics.GenericAPIView):
    """Crée un lien de paiement Swinmo pour le membre connecté."""
    permission_classes = [IsAuthenticated]
    serializer_class = InitiatePaymentSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            result = initiate_payment(request.user, data["kind"], data.get("amount"))
        except swinmo.SwinmoError:
            return Response({"detail": "Service de paiement indisponible. Réessayez plus tard."},
                            status=status.HTTP_502_BAD_GATEWAY)
        return Response(result, status=status.HTTP_201_CREATED)


class MyPaymentsViewSet(viewsets.ReadOnlyModelViewSet):
    """Historique des paiements du membre connecté."""
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(user=self.request.user).order_by("-paid_at")


class MySubscriptionsView(generics.ListAPIView):
    """Abonnements du membre connecté."""
    serializer_class = SubscriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Subscription.objects.filter(user=self.request.user).order_by("-created_at")


class SwinmoWebhookView(APIView):
    """Webhook Swinmo (RG-08). Authentifié par signature HMAC, pas par JWT."""
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = []

    def post(self, request):
        signature = request.headers.get("x-swinmo-signature")
        if not swinmo.verify_signature(request.body, signature):
            return Response({"detail": "Signature invalide."}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            body = json.loads(request.body or b"{}")
        except json.JSONDecodeError:
            return Response({"detail": "Corps invalide."}, status=status.HTTP_400_BAD_REQUEST)

        event = body.get("event", "")
        data = body.get("data") or {}
        outcome = process_webhook_event(event, data)
        # Toujours 200 si la signature est valide → évite les re-livraisons inutiles.
        return Response({"received": True, "outcome": outcome})
