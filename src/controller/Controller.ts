import type { Request, Response } from 'express'
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt"
import db from '../data/db.ts';

type userType = {
    username: string,
    email: string
    password: string,
}

export const getUsers = (req: Request, res: Response) => {
    const clients = db.prepare(`
        SELECT clients.id, clients.name, clients.email, clients.phone, clients.taxId, clients.statId
            COALESCE((
                SELECT SUM(ii.qty * ii.price * (1 + inv.taxRate / 100.0))
                FROM invoices inv
                JOIN invoice_items ii ON ii.invoiceId = inv.id
                WHERE inv.clientId = clients.id AND inv.status != 'paid'
            ), 0) AS owed
        FROM clients
    `).all()

    res.json(clients)
}

export const addUsers = (req: Request, res: Response) => {
    const { name, email, phone, taxId, statId } = req.body

    const insert = db.prepare('INSERT INTO clients (name, email, phone, taxId, statId) VALUES (?, ?, ?, ?, ?)');
    insert.run(name, email, phone, taxId, statId);

    res.status(201).json({ message: "user added" })
}

export const updateUsers = (req: Request, res: Response) => {
    const { name, email, phone, taxId, statId, id } = req.body

    db.prepare('UPDATE clients SET name = ?, email = ?, phone = ?, taxId = ?, statId = ? WHERE id = ?').run(name, email ?? null, phone ?? null, taxId ?? null, statId ?? null id)
    res.status(201).json({ message: 'user updated' })
}

export const deleteUsers = (req: Request, res: Response) => {
    const { id } = req.body

    db.prepare('DELETE FROM clients WHERE id = ?').run(id)
    res.status(200).json({ message: 'user deleted' })
}

export const getInvoices = (req: Request, res: Response) => {
    const invoices = db.prepare('SELECT invoices.*, clients.name AS clientName FROM invoices JOIN clients ON clients.id = invoices.clientId').all() as any[]
    const items = db.prepare('SELECT * FROM invoice_items WHERE invoiceId = ?')

    const result = invoices.map(inv => ({ ...inv, items: items.all(inv.id) }))

    res.json(result)
}

export const addInvoices = (req: Request, res: Response) => {
    const { clientId, date, dueDate, taxRate, items } = req.body

    const { n } = db.prepare('SELECT COUNT(*) AS n FROM invoices').get() as { n: number }
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(n + 1).padStart(3, '0')}`

    const result = db.prepare(
        'INSERT INTO invoices (invoiceNumber, clientId, date, dueDate, taxRate) VALUES (?, ?, ?, ?, ?)'
    ).run(invoiceNumber, Number(clientId), date, dueDate, taxRate)

    const insertItem = db.prepare(
        'INSERT INTO invoice_items (invoiceId, description, qty, price) VALUES (?, ?, ?, ?)'
    )
    for (const item of items) {
        insertItem.run(result.lastInsertRowid, item.description, item.qty, item.price)
    }

    res.status(201).json({ message: 'invoice added' })
}

export const updateInvoices = (req: Request, res: Response) => {
    const { clientId, date, dueDate, taxRate, items, id } = req.body

    const result = db.prepare('UPDATE invoices SET clientId = ?, date = ?, dueDate = ?, taxRate = ? WHERE id = ?').run(clientId, date ?? null, dueDate ?? null, taxRate ?? null, id)

    const insertItem = db.prepare(
        'INSERT INTO invoice_items (invoiceId, description, qty, price) VALUES (?, ?, ?, ?)'
    )
    db.prepare('DELETE FROM invoice_items WHERE invoiceId = ?').run(id)
    for (const item of items) {
        insertItem.run(id, item.description, item.qty, item.price)
    }

    res.status(201).json({ message: 'invoice updated' })
}

export const deleteInvoices = (req: Request, res: Response) => {
    const { id } = req.body

    const { n } = db.prepare('SELECT COUNT(*) AS n FROM invoices WHERE clientId = ?').get(id) as { n: number }
    if (n > 0) {
        return res.status(409).json({ message: 'client has invoices' })
    }

    db.prepare('DELETE FROM invoices WHERE id = ?').run(id)
    res.status(200).json({ message: 'invoice deleted' })
}

export const changeStatus = (req: Request, res: Response) => {
    const {id, e} = req.body

    db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run(e, id)
    res.status(200).json({ message: 'status updated' })
}

export const getDashboard = (req: Request, res: Response) => {
    const sum = `SELECT COALESCE(SUM(ii.qty * ii.price * (1 + inv.taxRate / 100.0)), 0) AS v
                 FROM invoices inv JOIN invoice_items ii ON ii.invoiceId = inv.id`

    const invoiced = (db.prepare(sum).get() as { v: number }).v
    const paid = (db.prepare(sum + " WHERE inv.status = 'paid'").get() as { v: number }).v
    const clients = (db.prepare('SELECT COUNT(*) AS v FROM clients').get() as { v: number }).v

    res.json({ invoiced, paid, unpaid: invoiced - paid, clients })
}

export const register = async (req: Request, res: Response): Promise<void | Response> => {
    const { username, password }: userType = req.body

    const existUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
    if (existUser) { return res.status(401).json({ message: 'username already exists' }) }

    const hashed: string = await bcrypt.hash(password, 10)
    const newUser = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hashed);

    res.status(201).json({ message: 'user created' })
}

export const login = async (req: Request, res: Response): Promise<void | Response> => {
    const { username, password }: userType = req.body

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as
    | { id: number; email: string; password: string }
    | undefined
    if (!user) return res.status(401).json({ error: 'wrong username or password' })

    const isMatch: boolean = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(401).json({ error: 'wrong username or password' })

    const token: string = jwt.sign({ id: user.id }, 'secret', { expiresIn: '1d' })
    res.json({ token })
}

export const getProfile = (req: Request, res: Response) => {
    const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get()
    res.json(profile ?? {})
}

export const saveProfile = (req: Request, res: Response) => {
    const { businessName, address, phone, nif, nis } = req.body

    db.prepare(`
        INSERT INTO profile (id, businessName, address, phone, nif, nis)
        VALUES (1, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            businessName = excluded.businessName,
            address = excluded.address,
            phone = excluded.phone,
            nif = excluded.nif,
            nis = excluded.nis
    `).run(businessName ?? '', address ?? '', phone ?? '', nif ?? '', nis ?? '')

    res.status(200).json({ message: 'profile saved' })
}
