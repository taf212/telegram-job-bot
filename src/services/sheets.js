import { google } from 'googleapis';
import { config } from '../config.js';

// ── Auth ───────────────────────────────────────────────────────────────────────

let _sheetsClient = null;

async function getSheetsClient() {
  if (_sheetsClient) return _sheetsClient;

  // Production : credentials passés comme variable d'env base64 (pas de fichier)
  // Local      : credentials lus depuis le fichier credentials.json
  let authConfig;

  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    const raw = Buffer.from(process.env.GOOGLE_CREDENTIALS_JSON, 'base64').toString('utf8');
    const credentials = JSON.parse(raw);
    authConfig = { credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] };
  } else {
    authConfig = {
      keyFile: config.sheets.credentialsPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    };
  }

  const auth = new google.auth.GoogleAuth(authConfig);

  _sheetsClient = google.sheets({ version: 'v4', auth });
  return _sheetsClient;
}

// ── Colonnes ───────────────────────────────────────────────────────────────────

const HEADERS = ['Job Title', 'Company', 'Location', 'Remote', 'Date', 'Salary', 'URL', 'Source', 'Score'];
const HISTORY_HEADERS = ['Searched At', 'Query', ...HEADERS];

function jobToRow(job) {
  return [
    job.title,
    job.company,
    job.location,
    job.remote ? 'Yes' : 'No',
    job.date ? new Date(job.date).toLocaleDateString('fr-FR') : '',
    job.salary || '',
    job.url,
    job.source,
    job.score ?? '',
  ];
}

function jobToHistoryRow(job, query, searchedAt) {
  return [searchedAt, query.raw, ...jobToRow(job)];
}

// ── latest_results : remplace toutes les lignes ────────────────────────────────

export async function writeLatest(jobs, query) {
  const sheets = await getSheetsClient();
  const spreadsheetId = config.sheets.spreadsheetId;
  const sheet = config.sheets.latestSheet;

  // Construire les valeurs : 1 ligne d'en-tête + 1 ligne de contexte + données
  const searchedAt = new Date().toLocaleString('fr-FR');
  const rows = [
    HEADERS,
    [`Recherche : ${query.raw}`, `Lancée le ${searchedAt}`, ...Array(HEADERS.length - 2).fill('')],
    ...jobs.map(jobToRow),
  ];

  // Clear puis insert en une seule opération (batchUpdate)
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${sheet}!A:Z`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheet}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  });

  // Mise en gras de la ligne d'en-tête
  await formatHeaderRow(sheets, spreadsheetId, sheet);

  console.log(`[sheets] latest_results mis à jour : ${jobs.length} offres`);
}

// ── history : append seulement ─────────────────────────────────────────────────

export async function appendHistory(jobs, query) {
  const sheets = await getSheetsClient();
  const spreadsheetId = config.sheets.spreadsheetId;
  const sheet = config.sheets.historySheet;

  const searchedAt = new Date().toLocaleString('fr-FR');

  // Vérifier si le sheet history existe déjà et a des données
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheet}!A1:A1`,
  });

  const rows = [];

  // Ajouter les en-têtes si feuille vide
  if (!existing.data.values || existing.data.values.length === 0) {
    rows.push(HISTORY_HEADERS);
  }

  rows.push(...jobs.map((job) => jobToHistoryRow(job, query, searchedAt)));

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheet}!A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  });

  console.log(`[sheets] history : ${jobs.length} lignes ajoutées`);
}

// ── Formatage : en-tête en gras ────────────────────────────────────────────────

async function formatHeaderRow(sheets, spreadsheetId, sheetName) {
  try {
    // Récupérer l'ID de la feuille
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetMeta = meta.data.sheets.find(
      (s) => s.properties.title === sheetName
    );
    if (!sheetMeta) return;

    const sheetId = sheetMeta.properties.sheetId;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  textFormat: { bold: true },
                  backgroundColor: { red: 0.2, green: 0.5, blue: 0.8 },
                  horizontalAlignment: 'CENTER',
                },
              },
              fields: 'userEnteredFormat(textFormat,backgroundColor,horizontalAlignment)',
            },
          },
          {
            autoResizeDimensions: {
              dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: HEADERS.length },
            },
          },
        ],
      },
    });
  } catch (err) {
    // Non-bloquant : le formatting est cosmétique
    console.warn('[sheets] Formatage header échoué (non bloquant):', err.message);
  }
}
