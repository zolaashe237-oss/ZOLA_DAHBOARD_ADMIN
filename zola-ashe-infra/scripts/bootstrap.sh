#!/usr/bin/env bash
# Clone les 4 repos ZOLA ASHÉ côte à côte (layout attendu par le compose).
# Usage : ./scripts/bootstrap.sh git@github.com:zola-ashe
set -euo pipefail

ORG="${1:-git@github.com:zola-ashe}"
PARENT="$(cd "$(dirname "$0")/../.." && pwd)"   # dossier parent des repos
REPOS=(zola-ashe-backend zola-ashe-web zola-ashe-admin)

echo "Dossier parent : $PARENT"
for repo in "${REPOS[@]}"; do
  if [ -d "$PARENT/$repo/.git" ]; then
    echo "✓ $repo déjà cloné"
  else
    echo "→ clone $repo"
    git clone "$ORG/$repo.git" "$PARENT/$repo"
  fi
done
echo "Terminé. Lancez 'make init' puis 'make up' depuis zola-ashe-infra."
