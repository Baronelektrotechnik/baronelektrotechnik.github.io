# Baron Elektrotechnik – Website (GitHub Pages)

Statische Website, keine Build-Tools nötig. Alle Seiten liegen als `ordner/index.html` vor.

## Deployment

1. Neues Repository anlegen (öffentlich, z. B. `baron-website`) und alle Dateien dieses Ordners in den `main`-Branch pushen.
2. Repository → **Settings → Pages** → Source: **Deploy from a branch**, Branch: `main`, Ordner: `/ (root)`.
3. **Custom Domain:** `www.baronelektrotechnik.de` eintragen (die Datei `CNAME` liegt bereits im Repo). "Enforce HTTPS" aktivieren, sobald das Zertifikat ausgestellt ist.
4. **DNS beim Domain-Provider:**
   - `www` → CNAME auf `<github-username>.github.io`
   - Apex `baronelektrotechnik.de` → A-Records auf `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`

Wichtig: Ohne Custom Domain (also unter `username.github.io/repo/`) funktionieren die absoluten Pfade (`/assets/…`) nicht. Entweder Custom Domain nutzen oder das Repo `<username>.github.io` nennen.

## Kontaktformular (Formspree)

In `kontakt/index.html` den Platzhalter `DEIN_FORM_ID` durch die echte Formspree-Form-ID ersetzen (formspree.io → Form anlegen → ID aus der Endpoint-URL). Benachrichtigung an info@baronelektrotechnik.de in Formspree konfigurieren.

## Bilder

- `assets/img/frankfurt-luft-1.jpg` / `-2.jpg`: Hero-Kameraflug. Zum Austausch einfach Dateien gleichen Namens ersetzen.
- `assets/img/innungslogo.png`: E-Marke der Innung.
- Übrige Bilder laden aktuell von Wix/Unsplash-CDNs. Vor einer Wix-Kündigung lokal ablegen.

## Alte URLs

Redirect-Stubs (Meta-Refresh) liegen unter `/kopie-von-wallbox-installation`, `/wallbox`, `/siedle`, `/innung`, `/ueberuns`, `/pv`.
