const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'tracker.db');
const JSON_FILE = path.join(DATA_DIR, 'tracker.json');

// Garantir que o diretório existe
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log('📁 Diretório data/ criado');
}

// Conectar ao banco
const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL'); // Melhor performance

console.log('💾 Conectado ao SQLite:', DB_FILE);

// Criar tabelas
db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS days (
    date TEXT PRIMARY KEY,
    peso REAL,
    cal INTEGER NOT NULL,
    carb REAL NOT NULL,
    prot REAL NOT NULL,
    gord REAL NOT NULL,
    agua INTEGER DEFAULT 0,
    foods TEXT NOT NULL,
    savedAt TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_days_savedAt ON days(savedAt);
`);

console.log('✅ Tabelas criadas/verificadas');

// Migrar dados do JSON se existir e o DB estiver vazio
function migrateFromJSON() {
  if (!fs.existsSync(JSON_FILE)) {
    console.log('ℹ️  Nenhum arquivo JSON para migrar');
    return;
  }

  const daysCount = db.prepare('SELECT COUNT(*) as count FROM days').get().count;
  if (daysCount > 0) {
    console.log('ℹ️  Banco já tem dados, pulando migração');
    return;
  }

  try {
    const jsonData = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    console.log('📦 Migrando dados do JSON...');

    // Migrar config
    if (jsonData.config) {
      const insertConfig = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');
      const insertMany = db.transaction((config) => {
        for (const [key, value] of Object.entries(config)) {
          insertConfig.run(key, JSON.stringify(value));
        }
      });
      insertMany(jsonData.config);
      console.log('✅ Configurações migradas');
    }

    // Migrar days
    if (jsonData.days && jsonData.days.length > 0) {
      const insertDay = db.prepare(`
        INSERT OR REPLACE INTO days (date, peso, cal, carb, prot, gord, agua, foods, savedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertMany = db.transaction((days) => {
        for (const day of days) {
          insertDay.run(
            day.date,
            day.peso || null,
            day.cal,
            day.c,
            day.p,
            day.g,
            day.agua || 0,
            JSON.stringify(day.foods || []),
            day.savedAt
          );
        }
      });
      insertMany(jsonData.days);
      console.log(`✅ ${jsonData.days.length} dias migrados`);
    }

    // Fazer backup do JSON e remover
    fs.renameSync(JSON_FILE, JSON_FILE + '.migrated');
    console.log('✅ Migração completa! JSON renomeado para .migrated');
  } catch (err) {
    console.error('❌ Erro na migração:', err.message);
  }
}

migrateFromJSON();

// Funções de acesso aos dados

function getConfig() {
  const rows = db.prepare('SELECT key, value FROM config').all();
  const config = {};
  for (const row of rows) {
    config[row.key] = JSON.parse(row.value);
  }
  return config;
}

function setConfig(config) {
  const insert = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');
  const update = db.transaction((cfg) => {
    for (const [key, value] of Object.entries(cfg)) {
      insert.run(key, JSON.stringify(value));
    }
  });
  update(config);
}

function getAllDays() {
  const rows = db.prepare('SELECT * FROM days ORDER BY savedAt ASC').all();
  return rows.map(row => ({
    date: row.date,
    peso: row.peso,
    cal: row.cal,
    c: row.carb,
    p: row.prot,
    g: row.gord,
    agua: row.agua,
    foods: JSON.parse(row.foods),
    savedAt: row.savedAt
  }));
}

function saveDay(day) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO days (date, peso, cal, carb, prot, gord, agua, foods, savedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    day.date,
    day.peso || null,
    day.cal,
    day.c,
    day.p,
    day.g,
    day.agua || 0,
    JSON.stringify(day.foods || []),
    day.savedAt
  );
}

function deleteDay(date) {
  const stmt = db.prepare('DELETE FROM days WHERE date = ?');
  stmt.run(date);
}

function getData() {
  return {
    config: getConfig(),
    days: getAllDays()
  };
}

module.exports = {
  db,
  getConfig,
  setConfig,
  getAllDays,
  saveDay,
  deleteDay,
  getData
};
