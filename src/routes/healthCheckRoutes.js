import { Router } from "express";
import { healthCheck } from "../controllers/healthCheck.js";

const healthCheckRoute = Router()

healthCheckRoute.route("/").get(healthCheck)

export default healthCheckRoute;