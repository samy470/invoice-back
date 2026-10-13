import express from 'express'
import { Router } from 'express'
import { getUsers, addUsers, updateUsers, deleteUsers, getInvoices, addInvoices, updateInvoices, deleteInvoices, changeStatus, getDashboard, login, register, getProfile, saveProfile } from '../controller/Controller.ts'
import { requireAuth } from '../middleware/auth.ts'

export const router: Router = express.Router()

router.post('/login', login)
router.post('/register', register)
// router.use(requireAuth)

router.get('/getusers', getUsers)
router.post('/addusers', addUsers)
router.put('/updateusers', updateUsers)
router.delete('/deleteusers', deleteUsers)

router.put('/changestatus', changeStatus)
router.get('/getdash', getDashboard)

router.get('/getinvoices', getInvoices)
router.post('/addinvoices', addInvoices)
router.put('/updateinvoices', updateInvoices)
router.delete('/deleteinvoices', deleteInvoices)

router.get('/getProfile', getProfile)
router.put('/saveProfile', saveProfile)
