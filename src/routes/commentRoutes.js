import { Router } from "express";
import { verifyJWT } from "../middlewares/authMiddleware.js";
import { createComment, editComment } from "../controllers/commentController.js";

const commentRoute = Router();

commentRoute.use(verifyJWT)

commentRoute.route('/create/:videoId').post(createComment)
commentRoute.route('/edit/:commentId').patch(editComment)

export default commentRoute