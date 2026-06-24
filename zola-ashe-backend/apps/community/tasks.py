"""Tâches asynchrones communauté — notifications de modération."""
from django.conf import settings
from django.core.mail import send_mail

from config.celery import app


@app.task
def send_moderation_notification(email: str, content_type: str, reason: str):
    """Notifie l'auteur d'un post ou commentaire supprimé par la modération."""
    labels = {"post": "votre publication", "commentaire": "votre commentaire"}
    libelle = labels.get(content_type, "votre contenu")
    send_mail(
        subject="ZOLA ASHÉ — Contenu retiré par la modération",
        message=(
            f"Bonjour,\n\n"
            f"Nous vous informons que {libelle} a été retiré par notre équipe de modération.\n\n"
            f"Motif : {reason or 'Non précisé'}\n\n"
            f"Si vous avez des questions, contactez-nous depuis votre espace membre.\n\n"
            f"L'équipe ZOLA ASHÉ"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        fail_silently=True,
    )
    return f"moderation_notification sent: {email} ({content_type})"
