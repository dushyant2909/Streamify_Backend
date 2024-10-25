import { Router } from "express";
import { verifyJWT } from "../middlewares/authMiddleware.js";
import { createComment } from "../controllers/commentController.js";

const commentRoute = Router();

commentRoute.use(verifyJWT)

commentRoute.route('/create/:videoId').post(createComment)

export default commentRoute