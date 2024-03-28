import mongoose, { isValidObjectId } from "mongoose"
import { Comment } from "../models/comments.model.js"
import ApiError from "../utils/ApiError.js"
import ApiResponse from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query

    if (!isValidObjectId(videoId))
        throw new ApiError(401, "Invalid video id");

    const videoFound = await Video.findById(videoId);

    if (!videoFound)
        throw new ApiError(401, "Video not found");

    const commentsAggregate = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes"
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                _id: 0,
                content: 1,
                createdAt: 1,
                likesCount: 1,
                owner: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1
                },
                isLiked: 1
            }
        }
    ]);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const comments = await Comment.aggregatePaginate(
        commentsAggregate,
        options
    );

    return res
        .status(200)
        .json(new ApiResponse(200, comments, "Comments fetched successfully"));

})

const addComment = asyncHandler(async (req, res) => {
    // S-1: Get video id from url and validate it
    // S-2: Get comment context from req.body
    // S-3: Create a comment

    // S-1
    const { videoId } = req.params;

    if (!isValidObjectId(videoId))
        throw new ApiError(401, "Invalid video id")

    const videoFound = await Video.findById(videoId)

    if (!videoFound)
        throw new ApiError(401, "Video not found")

    // S-2
    const { content } = req.body;

    if (!content)
        throw new ApiError(401, "Comment content not found")

    // S-3
    const commentCreation = await Comment.create({
        content,
        video: videoFound?._id,
        owner: req.user._id
    });

    if (!commentCreation)
        throw new ApiError(401, "Error in creaiting comment in Database")

    return res.status(200)
        .json(new ApiResponse(200, commentCreation, "Comment added successfully"))
})

const updateComment = asyncHandler(async (req, res) => {
    // S-1: Get comment id from url and validate and find comment
    // S-2: Verify the ownership of comment owner
    // S-3: Get edited information from req.bodyh
    // S-4: Modify comment and return response

    // S-1
    const { commentId } = req.params;

    if (!isValidObjectId(commentId))
        throw new ApiError(401, "Invalid comment id")

    const commentFound = await Comment.findById(commentId);

    if (!commentFound)
        throw new ApiError(401, "Comment not found");

    // S-2
    if (commentFound.owner.toString() !== req.user._id.toString())
        throw new ApiError(404, "You can not modify the comment as you are not the owner of the comment")

    // S-3
    const { content } = req.body;

    if (!content)
        throw new ApiError(401, "Comment content not found which needs to be edited")

    // S-4
    const commentEdited = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content
            }
        },
        { new: true }
    )

    if (!commentEdited)
        throw new ApiError(401, "Error in updating comment in Database")

    return res.status(200)
        .json(new ApiResponse(200, commentEdited, "Comment updated successfully"))

})

const deleteComment = asyncHandler(async (req, res) => {
    // S-1: Get comment id from req.params, validate and find comment
    // S-2: Check for owner id
    // S-3: Delete the comment

    // S-1
    const { commentId } = req.params;

    if (!isValidObjectId(commentId))
        throw new ApiError(401, "Invalid comment id");

    const commentFound = await Comment.findById(commentId);

    if (!commentFound)
        throw new ApiError(401, "Comment not found");

    // S-2
    if (commentFound.owner.toString() !== req.user._id.toString())
        throw new ApiError(404, "You can not delete the comment as you are not the owner of the comment")

    // S-3
    const deleteStatus = await Comment.findByIdAndDelete(
        commentId
    );

    if (!deleteStatus)
        throw new ApiError("Error in deleting comment from Database");

    return res.status(200)
        .json(new ApiResponse(200, {}, "Comment deleted successfully"));
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}