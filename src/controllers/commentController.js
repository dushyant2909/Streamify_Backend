import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Like } from "../models/like.model.js";

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
        video: video._id,
        text
    })

    return res.status(201)
        .json(new ApiResponse(201, comment, "Comment created successfully"))

})

const editComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    if (!commentId)
        throw new ApiError(401, "Comment id is required");
    if (!isValidObjectId(commentId))
        throw new ApiError(401, "Invalid comment id")

    const { updateText } = req.body;
    if (!updateText)
        throw new ApiError(401, "Updated comment text is required")

    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment)
        throw new ApiError(404, "Comment not found");

    if (comment.user.toString() !== userId.toString()) {
        throw new ApiError(403, "You do not have permission to update this comment");
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            text: updateText
        },
        { new: true }
    )

    return res.status(200)
        .json(new ApiResponse(200, updatedComment, "Comment edited successfully"))
})

const deleteComment = async (req, res, next) => {
    const session = await mongoose.startSession();
    await session.startTransaction()
    try {
        const { commentId } = req.params;
        if (!commentId)
            throw new ApiError(401, "Comment id is required");
        if (!isValidObjectId(commentId))
            throw new ApiError(401, "Invalid comment id")

        const userId = req.user._id;

        const comment = await Comment.findById(commentId).session(session);
        if (!comment)
            throw new ApiError(404, "Comment not found");

        if (comment.user.toString() !== userId.toString()) {
            throw new ApiError(403, "You do not have permission to delete this comment");
        }

        await Comment.findByIdAndDelete(commentId)
            .session(session)

        await session.commitTransaction(); // Commit the transaction
        return res.status(200).json(new ApiResponse(200, {}, "Comment deleted successfully"));
    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
}

const toggleLikeDislike = asyncHandler(async (req, res) => {
    const { commentId, type } = req.body;
    const userId = req.user._id;

    if (!commentId || !type)
        throw new ApiError(400, "All fields are required")

    if (!isValidObjectId(commentId))
        throw new ApiError(401, "Invalid comment id")

    const comment = await Comment.findById(commentId)
    if (!comment)
        throw new ApiError(400, "Comment not found")

    const likedStatus = await Like.findOne({
        comment: new mongoose.Types.ObjectId(commentId),
        user: userId
    })

    // If any entry found then toggle the type
    if (likedStatus) {
        // If the user is toggling between like and dislike
        if (likedStatus.type === type) {
            // Remove the like/dislike if it is the same action
            await Like.findByIdAndDelete(likedStatus._id);

            if (type === "like")
                comment.likes = Math.max(0, comment.likes - 1);
            else
                comment.dislikes = Math.max(0, comment.dislikes - 1);
        }
        else {
            // Update the like/dislike to the new type
            likedStatus.type = type;
            await likedStatus.save();

            if (type === "like") {
                comment.likes += 1;
                comment.dislikes = Math.max(0, comment.dislikes - 1);
            }
            else {
                comment.dislikes += 1;
                comment.likes = Math.max(0, comment.likes - 1)
            }
        }
    }
    // If entry not found then create an entry in db
    else {
        await Like.create({
            comment: new mongoose.Types.ObjectId(commentId),
            user: userId,
            type
        })

        if (type === "like")
            comment.likes += 1;
        else
            comment.dislikes += 1;
    }

    await comment.save()

    return res.status(200).json(
        new ApiResponse(201, {}, `Comment ${type}d successfully`)
    )
})

export {
    createComment,
    editComment,
    deleteComment,
    toggleLikeDislike
}