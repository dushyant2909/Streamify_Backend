import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        const accessToken = req.cookies.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        if (!accessToken)
            throw new ApiError(401, "Unauthorised request");

        const decodedToken = jwt.verify(
            accessToken,
            process.env.ACCESS_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken"
        )

        if (!user)
            throw new ApiError(401, "Invalid access token")

        req.user = user;
        next();
    } catch (error) {
        console.log("Error in authMiddleware::", error.message)
        throw new ApiError(401, error?.message || "Invalid access token")
    }
})

export { verifyJWT }