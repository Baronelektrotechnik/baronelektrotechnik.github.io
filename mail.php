<?php
declare(strict_types=1);

/**
 * Kontaktformular-Endpunkt fuer baronelektrotechnik.de
 *
 * Nimmt das Formular aus /kontakt/ an und schickt die Anfrage per E-Mail an
 * das eigene Postfach. Kein externer Dienstleister, keine Speicherung von
 * Formularinhalten auf dem Server.
 *
 * Versandweg:
 *   1. Wenn die Umgebungsvariable SMTP_HOST gesetzt ist, wird per SMTP
 *      verschickt (Zugangsdaten kommen aus Umgebungsvariablen, NIEMALS
 *      aus dieser Datei).
 *   2. Sonst wird die PHP-Funktion mail() des IONOS-Hosts benutzt.
 *
 * Antwortformat: JSON, damit assets/js/main.js damit arbeiten kann.
 */

// ---------------------------------------------------------------- Konfiguration

const MAIL_EMPFAENGER      = 'info@baronelektrotechnik.de';
const MAIL_ABSENDER        = 'info@baronelektrotechnik.de';
const MAIL_BETREFF         = 'Neue Anfrage ueber baronelektrotechnik.de';
const MAIL_MAX_PRO_STUNDE  = 5;      // pro IP
const MAIL_MIN_SEKUNDEN    = 3;      // schneller als das ist kein Mensch
const MAIL_MAX_ALTER       = 7200;   // Formular aelter als 2h -> abgelaufen
const MAIL_MAX_LINKS       = 3;      // mehr Links im Text -> Spam

// ---------------------------------------------------------------- Hilfsfunktionen

function antwort(int $status, bool $ok, string $meldung): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode(['ok' => $ok, 'message' => $meldung], JSON_UNESCAPED_UNICODE);
    exit;
}

/** Wirft ungueltige Bytes weg, damit die Regex-Filter zuverlaessig greifen. */
function nur_utf8(string $wert): string
{
    if (preg_match('//u', $wert) === 1) {
        return $wert;
    }
    return (string) preg_replace('/[\x80-\xFF]/', '', $wert);
}

/** Kuerzt zeichenweise, auch ohne mbstring-Erweiterung. */
function kuerzen(string $wert, int $max): string
{
    if (function_exists('mb_substr')) {
        return mb_substr($wert, 0, $max, 'UTF-8');
    }
    if (preg_match('/^.{0,' . $max . '}/us', $wert, $treffer) === 1) {
        return $treffer[0];
    }
    return substr($wert, 0, $max);
}

/** Entfernt Steuerzeichen und Zeilenumbrueche (Schutz vor Header-Injection). */
function saubere_zeile(string $wert, int $max = 200): string
{
    $wert = nur_utf8($wert);
    $wert = str_replace(["\r", "\n", "\0"], ' ', $wert);
    $wert = (string) preg_replace('/[\x00-\x1F\x7F]/', '', $wert);
    $wert = trim((string) preg_replace('/[ \t]+/', ' ', $wert));
    return kuerzen($wert, $max);
}

/** Erlaubt Zeilenumbrueche, entfernt aber Steuerzeichen. */
function sauberer_text(string $wert, int $max = 5000): string
{
    $wert = nur_utf8($wert);
    $wert = str_replace(["\r\n", "\r"], "\n", $wert);
    $wert = (string) preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $wert);
    return kuerzen(trim($wert), $max);
}

function feld(string $name): string
{
    return isset($_POST[$name]) && is_string($_POST[$name]) ? $_POST[$name] : '';
}

function betreff_kodieren(string $text): string
{
    return '=?UTF-8?B?' . base64_encode($text) . '?=';
}

/**
 * Einfaches IP-Ratelimit. Gespeichert wird nur ein Hash, keine IP im Klartext,
 * und die Datei wird automatisch alt und ueberschrieben.
 */
function ratelimit_ueberschritten(): bool
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    if ($ip === '') {
        return false;
    }
    $datei = sys_get_temp_dir() . '/baron_rl_' . hash('sha256', $ip . date('YmdH')) . '.txt';
    $stand = 0;
    if (is_file($datei) && (time() - (int) filemtime($datei)) < 3600) {
        $stand = (int) file_get_contents($datei);
    }
    if ($stand >= MAIL_MAX_PRO_STUNDE) {
        return true;
    }
    file_put_contents($datei, (string) ($stand + 1), LOCK_EX);
    return false;
}

// ---------------------------------------------------------------- SMTP-Versand

function smtp_lesen($verbindung): string
{
    $antwort = '';
    while (($zeile = fgets($verbindung, 515)) !== false) {
        $antwort .= $zeile;
        if (strlen($zeile) < 4 || $zeile[3] !== '-') {
            break;
        }
    }
    return $antwort;
}

function smtp_befehl($verbindung, string $befehl, string $erwartet): void
{
    if ($befehl !== '') {
        fwrite($verbindung, $befehl . "\r\n");
    }
    $antwort = smtp_lesen($verbindung);
    if (strncmp($antwort, $erwartet, strlen($erwartet)) !== 0) {
        throw new RuntimeException('SMTP: unerwartete Antwort auf "' . strtok($befehl, ' ') . '"');
    }
}

function per_smtp_senden(string $von, string $an, string $kopf, string $koerper): void
{
    $host = (string) getenv('SMTP_HOST');
    $port = (int) (getenv('SMTP_PORT') ?: 587);
    $user = (string) getenv('SMTP_USER');
    $pass = (string) getenv('SMTP_PASS');
    $verschl = strtolower((string) (getenv('SMTP_ENCRYPTION') ?: 'tls'));

    $ziel = ($verschl === 'ssl' ? 'ssl://' : 'tcp://') . $host . ':' . $port;
    $verbindung = @stream_socket_client($ziel, $fehlernr, $fehlertext, 15);
    if (!$verbindung) {
        throw new RuntimeException('SMTP: keine Verbindung (' . $fehlertext . ')');
    }
    stream_set_timeout($verbindung, 15);

    smtp_befehl($verbindung, '', '220');
    smtp_befehl($verbindung, 'EHLO baronelektrotechnik.de', '250');

    if ($verschl === 'tls') {
        smtp_befehl($verbindung, 'STARTTLS', '220');
        if (!@stream_socket_enable_crypto($verbindung, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            throw new RuntimeException('SMTP: TLS fehlgeschlagen');
        }
        smtp_befehl($verbindung, 'EHLO baronelektrotechnik.de', '250');
    }

    if ($user !== '') {
        smtp_befehl($verbindung, 'AUTH LOGIN', '334');
        smtp_befehl($verbindung, base64_encode($user), '334');
        smtp_befehl($verbindung, base64_encode($pass), '235');
    }

    smtp_befehl($verbindung, 'MAIL FROM:<' . $von . '>', '250');
    smtp_befehl($verbindung, 'RCPT TO:<' . $an . '>', '250');
    smtp_befehl($verbindung, 'DATA', '354');

    $daten = $kopf . "\r\n" . str_replace("\n", "\r\n", $koerper);
    $daten = preg_replace('/^\./m', '..', $daten) ?? $daten;
    fwrite($verbindung, $daten . "\r\n.\r\n");
    smtp_befehl($verbindung, '', '250');
    smtp_befehl($verbindung, 'QUIT', '221');
    fclose($verbindung);
}

// ---------------------------------------------------------------- Ablauf

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    antwort(405, false, 'Nur POST erlaubt.');
}

// Honeypot: unsichtbare Felder, die nur Bots ausfuellen.
if (saubere_zeile(feld('botcheck')) !== '' || saubere_zeile(feld('firmenwebsite')) !== '') {
    antwort(200, true, 'Danke.');
}

// Zeitfenster: von JavaScript gesetzter Zeitstempel.
$ts = (int) feld('ts');
if ($ts > 0) {
    $alter = time() - (int) ($ts / 1000);
    if ($alter < MAIL_MIN_SEKUNDEN || $alter > MAIL_MAX_ALTER) {
        antwort(200, true, 'Danke.');
    }
}

if (ratelimit_ueberschritten()) {
    antwort(429, false, 'Zu viele Anfragen. Bitte rufen Sie uns an: 069 87 00 17 43-0');
}

$vorname  = saubere_zeile(feld('vorname'), 80);
$nachname = saubere_zeile(feld('nachname'), 80);
$telefon  = saubere_zeile(feld('telefon'), 40);
$email    = saubere_zeile(feld('email'), 120);
$thema    = saubere_zeile(feld('betreff'), 80);
$anliegen = sauberer_text(feld('anliegen'), 5000);

if ($vorname === '' || $nachname === '' || $anliegen === '') {
    antwort(400, false, 'Bitte fuellen Sie alle Pflichtfelder aus.');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    antwort(400, false, 'Bitte pruefen Sie Ihre E-Mail-Adresse.');
}
if (preg_match_all('#https?://#i', $anliegen) > MAIL_MAX_LINKS) {
    antwort(200, true, 'Danke.');
}

$absender_name = betreff_kodieren('Website Baron Elektrotechnik');
$betreff       = betreff_kodieren(MAIL_BETREFF . ' - ' . $vorname . ' ' . $nachname);

$koerper = "Neue Anfrage ueber das Kontaktformular\n"
    . "----------------------------------------\n\n"
    . "Name:      " . $vorname . ' ' . $nachname . "\n"
    . "E-Mail:    " . $email . "\n"
    . "Telefon:   " . ($telefon !== '' ? $telefon : '-') . "\n"
    . "Thema:     " . ($thema !== '' ? $thema : '-') . "\n"
    . "Eingang:   " . date('d.m.Y H:i') . " Uhr\n\n"
    . "Anliegen:\n" . $anliegen . "\n\n"
    . "----------------------------------------\n"
    . "Gesendet vom Kontaktformular auf baronelektrotechnik.de\n";

$header = [
    'From: ' . $absender_name . ' <' . MAIL_ABSENDER . '>',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: baron-kontaktformular',
];

try {
    if ((string) getenv('SMTP_HOST') !== '') {
        $kopf = 'To: ' . MAIL_EMPFAENGER . "\r\n"
            . 'Subject: ' . $betreff . "\r\n"
            . 'Date: ' . date('r') . "\r\n"
            . implode("\r\n", $header) . "\r\n";
        per_smtp_senden(MAIL_ABSENDER, MAIL_EMPFAENGER, $kopf, $koerper);
    } else {
        $erfolg = mail(
            MAIL_EMPFAENGER,
            $betreff,
            $koerper,
            implode("\r\n", $header),
            '-f' . MAIL_ABSENDER
        );
        if (!$erfolg) {
            throw new RuntimeException('mail() hat false zurueckgegeben');
        }
    }
} catch (Throwable $e) {
    error_log('Kontaktformular: ' . $e->getMessage());
    antwort(500, false, 'Versand fehlgeschlagen. Bitte rufen Sie uns an: 069 87 00 17 43-0');
}

antwort(200, true, 'Danke fuer Ihre Nachricht.');
