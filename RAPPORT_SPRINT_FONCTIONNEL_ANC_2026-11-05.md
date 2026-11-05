# SPEEDARTI ANC — Recette fonctionnelle 2026-11-05

## Portée
Dépôt public `AGENCE-GSTAI-EN-COURS/speedarti-anc-demo` uniquement. Pas de changement à `GSTAI-Sp/speedarti-v2`, à la production ou au moteur privé.

## Blocs traités, commits distincts
1. **Sondages et horizons** : nouveau sondage vierge et horizon modifiable, sauvegarde des modifications, limitation du rechargement d'anciens écrans HTML.
2. **Porchet** : données du dossier préremplies, temps modifiables, ajout/suppression de relevés, aucune division par zéro pour temps 0. Les formules restent **indicatives** jusqu'à comparaison signée avec Excel Fred.
3. **Sources** : requête Open-Meteo historique si date et coordonnées correctes ; requête Géorisques v1 avec résultat brut tracé et sans conclusion réglementaire automatique ; ouverture InfoTerre sur le point du dossier. La carte BRGM est consultable en couche WMS, pas interprétée automatiquement en nature de sol.
4. **Rapport** : génération provisoire sur plusieurs pages à partir des données du dossier sans remplir les valeurs manquantes par des données fictives ; les annexes non enregistrées sont signalées.
5. **Cartes** : onglets Situation, Cadastre, Aérien, BRGM, Implantation ; galerie limitée aux cartes enregistrées par le dossier. Les vues enregistrées sont des URLs GetMap WMS et non des fichiers image figés archivés.
6. **Tests** : Playwright desktop/mobile sur parcours de création de sondages, Porchet configurable, météo simulée, galerie et rapport ; maintenir les tests existants.

## Non validé / restant pour un produit métier
- Parité Excel Fred, calculs réglementaires, qualité réelle des sources/cartes sur terrain, réponses Géorisques par risque, interprétation professionnelle et contrôles RLS.
- Exports PDF/DOCX professionnels définitifs et archivage des captures cartographiques en fichiers image persistants, plan réglementaire coté complet.
- Intégration de la base de connaissances existante d'Ángel et questions Anne-Sophie.
- À vérifier en environnement réel : disponibilité CORS des services WMS et de l'API Géorisques ; Open-Meteo archive dépend de la date historique et de la disponibilité.
- Pas de fusion/déploiement sans tests CI réussis.

**Règle : informations provenant d'un service extérieur = provenance et date de consultation ; jamais de résultat réglementaire automatique sans validation humaine.**
