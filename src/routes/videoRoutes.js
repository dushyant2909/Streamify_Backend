import { Router } from 'express';
import { toggleVideoLikeDislike, updateVideoDetails, uploadVideo } from '../controllers/videoController.js';
import { verifyJWT } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/multerMiddleware.js';

const videoRoute = Router();

videoRoute.use(verifyJWT);
videoRoute.route('/upload').post(
    upload.fields([
        {
            name: "url",
            maxCount: 1
        },
        {
            name: "thumbnail",
            maxCount: 1
        }
    ])
    , uploadVideo)
videoRoute.route("/toggleLike").post(toggleVideoLikeDislike)
videoRoute.route("/update/:videoId").patch(updateVideoDetails)

export default videoRoute;