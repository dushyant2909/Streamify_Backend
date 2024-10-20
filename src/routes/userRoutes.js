import { Router } from "express";
import { changeCurrentPassword, loginUser, logoutUser, refreshAccessToken, registerUser } from "../controllers/userController.js";
import { upload } from "../middlewares/multerMiddleware.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";

const userRoute = Router()

userRoute.route('/register').post(
    upload.fields([
        {
            name: "profileImage",
            maxCount: 1
        },
        {
            name: "bannerImage",
            maxCount: 1
        }
    ]),
    registerUser)

userRoute.route('/login').post(loginUser);
userRoute.route('/refresh-access-token').post(refreshAccessToken)

// Secured routes
userRoute.use(verifyJWT)
userRoute.route('/logout').post(logoutUser)
userRoute.route('/change-password').post(changeCurrentPassword)

export default userRoute