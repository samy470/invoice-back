import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('clients.db');

db.exec(`CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    taxId TEXT,
    owed REAL DEFAULT 0
)`);

db.exec(`CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY,
    invoiceNumber TEXT NOT NULL,
    clientId INTEGER NOT NULL,
    date TEXT,
    dueDate TEXT,
    taxRate REAL DEFAULT 19,
    status TEXT DEFAULT 'draft',
    FOREIGN KEY (clientId) REFERENCES clients(id)
)`);

db.exec(`CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY,
    invoiceId INTEGER NOT NULL,
    description TEXT,
    qty INTEGER,
    price REAL,
    FOREIGN KEY (invoiceId) REFERENCES invoices(id) ON DELETE CASCADE
)`);

export default db;