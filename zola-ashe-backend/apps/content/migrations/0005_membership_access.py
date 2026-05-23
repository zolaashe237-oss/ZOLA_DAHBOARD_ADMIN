"""Aligne le contrôle d'accès des contenus sur l'adhésion unique `MEMBRE`.

- `access_subscription_types` : tout ancien code (ANNUEL/BRANCHE_*) devient
  `MEMBRE` (dédupliqué). Liste vide (contenu libre) inchangée.
- Les contenus rattachés aux anciennes branches Femme/Enfant sont désactivés
  (ces branches n'existent plus dans le modèle).
"""
from django.db import migrations

_OLD = {"ANNUEL", "BRANCHE_FEMME", "BRANCHE_ENFANT"}


def forwards(apps, schema_editor):
    Content = apps.get_model("content", "Content")

    for c in Content.objects.all():
        types = c.access_subscription_types or []
        new = ["MEMBRE"] if any(t in _OLD or t == "MEMBRE" for t in types) else []
        active = False if c.branch in ("FEMME", "ENFANT") else c.active
        if new != types or active != c.active:
            c.access_subscription_types = new
            c.active = active
            c.save(update_fields=["access_subscription_types", "active"])


class Migration(migrations.Migration):
    dependencies = [("content", "0004_content_thumbnail_key")]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
