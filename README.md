# SpeedArti ANC V3 — démonstration publique interactive

La présentation reprend les **14 vrais écrans ANC V3**, générés depuis le dépôt source privé puis publiés sous forme d'HTML/CSS **sans aucun code métier confidentiel**.

## Sprint 4 — déblocage du parcours Fred

- Les formulaires sont modifiables ; la démo garde les changements **localement dans le navigateur**, même après un rechargement.
- Bouton « Suivant → » en bas des écrans et statut d'enregistrement ; aucun bouton Enregistrer.
- Ajout, suppression et duplication de sondages et horizons fictifs.
- Champ pente doté d'un comparateur `<`, `=` ou `>`.
- Détection cadastrale et BRGM simulées avec le dossier d'exemple. **Aucune recherche réelle de parcelle ni donnée scientifique authentifiée n'est effectuée dans la vitrine.**
- Ajout de photos et bibliothèque du matériel à réutiliser dans ce navigateur.
- Prévisualisation des processus Porchet, plans, contrôles et rapports en mode **SPÉCIMEN**.
- Export/import JSON du dossier fictif. Ces sauvegardes ne sont ni transmises à SpeedArti ni synchronisées entre appareils.

La démonstration n'est pas un outil d'étude ANC validée. Tous les calculs techniques sont absents du dépôt public. Les actions dites « simuler » modifient l'aperçu ou affichent le scénario d'exemple ; elles ne produisent pas de dimensionnement réglementaire et ne vérifient pas un dossier réel. La visualisation d'éditeur cartographique n'est pas équivalente à un éditeur de géométries fonctionnel.

## Dépôts et règles

- **Privé** : `AGENCE-GSTAI-EN-COURS/speedarti-anc-src` — moteur ANC, formules, connecteurs, tests et extensions Fred.
- **Public** : `AGENCE-GSTAI-EN-COURS/speedarti-anc-demo` — uniquement les vues et le code de parcours fictif.
- `GSTAI-Sp/speedarti-v2` — lecture seule absolue.

**ÁNGEL PROPOSE — LE PROFESSIONNEL VALIDE.**

## Synchronisation des dossiers — correctif de parcours

La nouvelle couche `assets/live-workflow.js` relie en local la création de clients, la sélection d’études, les champs du dossier, les sondages, les feuilles Porchet KP1–KP4 et le rapport. Le bouton d’en-tête dirige désormais vers **Voir mon rapport**, car il n’existe pas de calcul réglementaire global dans le dépôt public. Les données restent sur cet appareil, ne sont pas synchronisées avec SpeedArti.

## Sauvegarde sur ANC DEV

Un compte de test autorisé peut ouvrir le panneau **Sauvegarde ANC DEV** pour sauvegarder et rouvrir un dossier fictif. La démo publique conserve son fonctionnement local pour les visiteurs. La sauvegarde serveur couvre les formulaires du dossier, l’état des feuilles Porchet et le plan de démonstration. Les photos, les captures et les fragments HTML restent locaux. Le projet Supabase cible est dédié à l’ANC et les sauvegardes de la démo sont propres à son format.

Le bouton de connexion envoyé par e-mail ouvre la démo dans le même navigateur. Dans Supabase ANC DEV, régler **Authentication → URL Configuration → Site URL** sur `https://agence-gstai-en-cours.github.io/speedarti-anc-demo/` avant le déploiement de ce parcours.
