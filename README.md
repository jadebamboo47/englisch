# Englisch für unterwegs

Installierbare Web-App (PWA) zum Englischlernen für Reisen und Alltag – 10 Lektionen, Kopftraining, Sprachausgabe über die Stimmen des Geräts. Funktioniert nach der Installation komplett offline. Kein Konto, keine Daten nach außen: Der Lernstand bleibt auf dem Gerät.

## Online stellen (GitHub Pages)
1. Alle Dateien dieses Ordners in ein GitHub-Repository hochladen.
2. Repository → Settings → Pages → „Deploy from a branch“ → Branch `main`, Ordner `/ (root)`.
3. Nach 1–2 Minuten ist die App unter `https://<name>.github.io/<repo>/` erreichbar.

## Installieren
- **iPad/iPhone:** Link in Safari öffnen → Teilen → „Zum Home-Bildschirm“.
- **Computer (Chrome/Edge):** Link öffnen → Installieren-Symbol in der Adressleiste oder Menü → „App installieren“.

## Änderungen ausrollen
Nach jeder Änderung in `sw.js` die `VERSION` hochzählen (z. B. `v2`). Beim nächsten Start mit Internet holt sich die App die neue Fassung.
