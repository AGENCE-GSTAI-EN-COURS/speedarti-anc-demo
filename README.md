# SpeedArti ANC V3 — démonstration publique fidèle

Cette vitrine reprend **l'apparence réelle du module privé SpeedArti ANC V3**, et non l'ancienne interface simplifiée créée par erreur.

## Contenu publié

- Barre supérieure, navigation et **14 onglets historiques**.
- Fiches dossier/terrain, sondages, horizons et choix multiples AXIS.
- Vues Porchet, « Plan & métrés », cartes, automatisation, règles, contrôles et rapport.
- Panneaux V3 **générés dans le dépôt privé** en navigateur avec un dossier totalement fictif, puis copiés sous forme de **HTML rendu assaini**.
- Fichiers publics : `index.html`, `assets/public.js`, `assets/public.css`, `assets/original.css`, `sections/*.html`.
- Tests navigateur sur ordinateur et smartphone, 14 onglets et vérifications des panneaux AXIS.

## Sécurité et limites

Le dépôt public **ne contient aucun calculateur ANC**, ni moteur Porchet, algorithmes cartographiques, API, données clients réelles ou accès Supabase. Il présente les résultats de **scénarios fictifs figés**, non validés professionnellement.

Le navigateur public permet de visiter les écrans V3 et de consulter les informations. Les boutons qui nécessitent le moteur privé signalent explicitement la limitation ; ils ne réalisent pas de calculs réglementaires.

Les **sources confidentielles et la logique métier** restent sur le dépôt privé :
`AGENCE-GSTAI-EN-COURS/speedarti-anc-src`.

Toute formule et tout choix d'implantation nécessitent l'approbation du professionnel et les validations métier encore attendues de Fred.

**ÁNGEL PROPOSE — LE PROFESSIONNEL VALIDE.**

## Publication

GitHub Actions publie uniquement la coque, les styles V3 et les 14 vues HTML. Le workflow contrôle le nombre de vues et refuse les dossiers sources métier.
