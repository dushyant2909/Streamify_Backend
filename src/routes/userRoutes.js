import { Router } from "express";
import { loginUser, refreshAccessToken, registerUser } from "../controllers/userController.js";
import { upload } from "../middlewares/multerMiddleware.js";

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

export default userRoute