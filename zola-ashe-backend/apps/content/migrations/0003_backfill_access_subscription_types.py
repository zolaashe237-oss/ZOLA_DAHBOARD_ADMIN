"""Rétro-remplit `access_subscription_types` des contenus existants à partir de
leur branche (GENERALE→ANNUEL, FEMME→BRANCHE_FEMME, ENFANT→BRANCHE_ENFANT), pour
préserver le comportement d'accès avant le passage au modèle d'abonnement explicite.
"""
from django.db import migrations

_BRANCH_TO_TYPES = {
    "GENERALE": ["ANNUEL"],
    "FEMME": ["BRANCHE_FEMME"],
    "ENFANT": ["BRANCHE_ENFANT"],
}


def forwards(apps, schema_editor):
    Content = apps.get_model("content", "Content")
    for content in Content.objects.all():
        if not content.access_subscription_types:
            content.access_subscription_types = _BRANCH_TO_TYPES.get(content.branch, [])
            content.save(update_fields=["access_subscription_types"])


def backwards(apps, schema_editor):
    # Pas de retour : on laisse les listes en place (champ simplement ignoré).
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0002_content_access_subscription_types"),
    ]
    operations = [
        migrations.RunPython(forwards, backwards),
    ]
