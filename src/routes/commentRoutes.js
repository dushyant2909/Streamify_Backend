import { Router } from "express";
import { verifyJWT } from "../middlewares/authMiddleware.js";
import { createComment, deleteComment, editComment, toggleLikeDislike } from "../controllers/commentController.js";

const commentRoute = Router();

commentRoute.use(verifyJWT)

commentRoute.route('/create/:videoId').post(createComment)
commentRoute.route('/edit/:commentId').patch(editComment)
commentRoute.route('/delete/:commentId').delete(deleteComment)
commentRoute.route('/toggleLikeDislike').post(toggleLikeDislike)

export default commentRoute