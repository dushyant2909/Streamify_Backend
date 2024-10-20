import { Router } from "express";
import { registerUser } from "../controllers/userController.js";
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

export default userRoute