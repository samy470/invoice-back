import jwt from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ message: 'no token' })

    try {
        const payload = jwt.verify(token, 'secret') as { id: number }
        res.locals.userId = payload.id
        next()
    } catch {
        res.status(401).json({ message: 'invalid token' })
    }
}