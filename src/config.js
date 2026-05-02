import 'dotenv/config';

export const config = {
  port: process.env.PORT || 3000,

  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN,
    // 'polling' → développement local (pas de ngrok)
    // 'webhook' → production (URL publique requise)
    mode: process.env.TELEGRAM_MODE || 'polling',
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL || '',
  },

  sheets: {
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
    latestSheet: process.env.GOOGLE_SHEET_LATEST || 'latest_results',
    historySheet: process.env.GOOGLE_SHEET_HISTORY || 'history',
    credentialsPath: process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json',
  },

  apis: {
    adzuna: {
      appId: process.env.ADZUNA_APP_ID,
      appKey: process.env.ADZUNA_APP_KEY,
      country: process.env.ADZUNA_COUNTRY || 'fr',
    },
    franceTravail: {
      clientId: process.env.FRANCE_TRAVAIL_CLIENT_ID,
      clientSecret: process.env.FRANCE_TRAVAIL_CLIENT_SECRET,
    },
    jsearch: {
      apiKey: process.env.JSEARCH_API_KEY,
    },
  },

  cache: {
    ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '300', 10),
  },

  scoring: {
    recencyWeight: 0.4,
    relevanceWeight: 0.6,
    remoteBonus: 5,
    maxDaysOld: 30,
  },
};
