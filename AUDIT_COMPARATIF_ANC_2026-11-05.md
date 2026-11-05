# SPEEDARTI ANC — AUDIT COMPARATIF ET RECETTE — 05/11/2026

## Périmètre et vérité de référence

- Version **actuelle publique** : `AGENCE-GSTAI-EN-COURS/speedarti-anc-demo`.
- Version métier historique **privée** : `AGENCE-GSTAI-EN-COURS/speedarti-anc-src` (lecture seule pendant cet audit).
- État public antérieur : commit `7ab5de33ba705ef427facd47f3700251b26034a0` (02/11/2026).
- `GSTAI-Sp/speedarti-v2` : **strictement inchangé**.
- Aucune modification des bases de production, de l'application SpeedArti ni d'Ángel.

La démo publique n'est **pas** le moteur professionnel privé : elle propose un parcours local compatible avec un essai fonctionnel, mais conserve des fonctions simulées et ne donne pas accès aux calculs réglementaires propriétaires. Les tests automatisés ne prouvent pas à eux seuls la complétude du produit.

## Comparatif fonctionnel par écran

| Écran | Démo publique actuelle | Écart constaté / action de finalisation |
|---|---|---|
| Études | Dossiers de test en stockage navigateur | Pas de synchronisation réelle SpeedArti/Supabase ; sécuriser multi-utilisateurs dans la version privée |
| Clients | Choix et création de clients locaux, préremplissage du dossier | Pas de vraie base clients SpeedArti ; raccorder via adaptateur privé et RLS avec Anne-Sophie |
| Dossier | Adresse → géocodage IGN → référence/surface cadastrale ; GPS et altitude IGN ; informations de base | Une adresse peut localiser la rue ou une parcelle voisine : **sélection manuelle sur carte ajoutée dans ce sprint**, confirmation et provenance |
| Fiche chantier | Saisie terrain et appels météo/Géorisques | Requêtes réelles à tester sur des dossiers réels ; ne jamais conclure « aucun risque » en cas d'échec |
| Sondages | Ajout/duplication d'horizons et sondages en local | Vérification métier et comparaison avec le moteur historique, compatibilité des anciennes saisies |
| Porchet | Temps et relevés modifiables dans le parcours public | **Parité cellules/formules avec Excel de Fred non validée** ; ne pas utiliser pour dimensionnement définitif |
| Plan & métrés | Leaflet, orthophoto, cadastre, BRGM, vues de test | Le moteur privé `v3/anc-map.js` possède des outils d'édition vectorielle/métrés/cotations plus avancés qui ne sont pas intégrés à la démo |
| Photos | Bibliothèque locale et commandes d'ajout | Test de capture caméra Android/iPhone, gestion réelle des fichiers et synchronisation à terminer |
| Cartes dossier | Galerie des vues enregistrées | URLs WMS de référence, **pas d'images figées archivées** équivalentes à l'ancienne fonction « Figer l'image » |
| Automatisation | Interface de démonstration | Plusieurs boutons donnent un retour simulé ; doivent être connectés au moteur privé |
| Règles | Interface et contrôles indicatifs | Calculs réglementaires non déployés dans le dépôt public ; validation métier/réglementaire obligatoire |
| Contrôles | Affichage de vérifications | Contrôles professionnels complets et validation des seuils restent à finir dans la version privée |
| Tests | Scénarios d'interface et Playwright | Ajouter des tests avec réseaux externes, Android/iOS physiques, offline et dossiers réels autorisés |
| Rapport | HTML provisoire multipage | Export Word simulé, PDF professionnel/annexes réelles et captures figées non finalisés ; ne pas confondre avec un rapport validé |

## Correctif actuel : changer une parcelle mal géocodée

1. Ouvrir **Dossier** ou **Plan & métrés** ; activer **« Déplacer le point / choisir une autre parcelle »**.
2. Cliquer sur le terrain souhaité sur la carte (ou déplacer le repère sélectionnable).
3. Le point est interrogé auprès de l'API Carto IGN en WGS84 (longitude, latitude). La **référence et la contenance proposée** s'affichent.
4. S'il existe plusieurs réponses, choisir la bonne référence dans la liste.
5. Cliquer sur **« Confirmer cette parcelle »**. Avant ce clic, aucune parcelle enregistrée ne change.
6. Après confirmation : mise à jour du point GPS, section, numéro, superficie cadastrale, contour, provenance et nouvelle recherche d'altitude ; conserver les autres parcelles expressément ajoutées manuellement.
7. Tester **Annuler**, le changement d'onglet, le rechargement et le mobile tactile.

**Ne jamais attribuer automatiquement à cette nouvelle parcelle la surface disponible ANC, la pente, l'orientation ou un diagnostic géologique : ces éléments exigent un levé/plan, une source validée ou l'expertise de Fred.**

## Vérifications exigées et limites

- Tests Playwright de sélection par clic, proposition multi-parcelles, confirmation, annulation, remplacement et persistance, en desktop et mobile.
- Parcours des **14 sections**, vérification des erreurs d'initialisation et des valeurs fictives dans un nouveau dossier.
- Les réponses du cadastre dans les tests de parcours sont **simulées** pour établir un comportement déterministe ; le chargement réel de l'API IGN doit être vérifié sur le terrain.
- Vérifier dans GitHub Actions la compilation/syntaxe, la CI complète et les tests du site publié après fusion.
- Ne pas déclarer le module complet ni prêt à intégrer avant la validation des données externes, des formules de Fred, des captures de cartes, des documents professionnels et des 25 questions Anne-Sophie.

## Plan de finalisation privé prioritaire

1. Recette du dossier réel et de la correction cartographique avec Fred.
2. Reprise du moteur `v3/anc-map.js` en environnement privé (dessin, métrés, couches et figement) **sans divulguer son code dans le dépôt public**.
3. Migration TS et tests de parité Porchet/Fred.
4. Annexes / captures réelles et rapports PDF/DOCX professionnels.
5. Connexion Clients/Dossiers SpeedArti, RLS, permissions et actions Ángel avec Anne-Sophie et base Ángel existante ; toujours en TEST.
6. Recette mobile terrain et validation métier explicite, avant toute proposition de production.

**Ne pas interpréter « tous les tests UI réussis » comme « toutes les fonctionnalités professionnelles terminées ».**
