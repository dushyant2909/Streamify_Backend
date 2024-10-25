import { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!videoId)
        throw new ApiError(404, "Video id is required")
    if (!isValidObjectId(videoId))
        throw new ApiError(400, "Invalid video id")

    const { text } = req.body;
    if (!text)
        throw new ApiError(404, "Comment text is required")

    const userId = req.user._id;

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const comment = await Comment.create({
        user: userId,
        video,
        text
    })

    return res.status(200)
        .json(new ApiResponse(200, comment, "Comment created successfully"))

})

export { createComment }