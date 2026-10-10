import express from 'express'
import cors from 'cors'
import { router } from './routes/Router.ts'
import type {Express, Request, Response} from "express"

const port = process.env.PORT ?? 8000
const app: Express = express()
app.use(express.json())
app.use(cors())

app.use('/', router)

app.use((req: Request, res: Response) => {
    res.status(404).json({message:'there is no such root'})
})

app.listen(port, () => {
    console.log('your app is running on', port)
})
