import {Router} from "express";

import {healthcheck} from"../controllers/healthCheck.controler.js"


const router=Router()


router.route("/").get(healthcheck)


export default router
 
