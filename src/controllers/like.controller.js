import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/likes.model.js"
import ApiResponse from "../utils/ApiResponse.js"
import ApiError from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"

// TODO: get liked status

const toggleVideoLike = asyncHandler(async (req, res) => {
    // S-1: Get video id from url and validate
    // S-2: Find liked Status
    // S-3: Create or delete in database accordingly

    // S-1
    const { videoId } = req.params

    if (!isValidObjectId(videoId))
        throw new ApiError(401, "Invalid video id");

    // S-2:
    const likedStatus = await Like.findOne({
        video: videoId,
        likedBy: req.user._id
    });


    if (likedStatus) {
        await Like.findByIdAndDelete(likedStatus?._id)

        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }));
    }

    await Like.create({
        video: videoId,
        likedBy: req.user._id
    })

    return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true }));
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    //TODO: toggle like on comment
    // Will do after handling comment controller
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    //TODO: toggle like on tweet
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id),
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videoDetail",
            },
        },
        {
            $addFields: {
                videoDetail: {
                    $first: "$videoDetail",
                },
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "videoDetail.videoOwner",
                foreignField: "_id",
                as: "ownerDetails",
            },
        },
        {
            $addFields: {
                ownerDetails: {
                    $first: "$ownerDetails",
                },
            },
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $project: {
                _id: 0,
                video: 0,
                likedBy: 0,
                createdAt: 0,
                updatedAt: 0,
                __v: 0,
                videoDetail: {
                    _id: 0,
                    isPublished: 0,
                    videoOwner: 0,
                    __v: 0,
                    updatedAt: 0,
                },
                ownerDetails: {
                    _id: 0,
                    watchHistory: 0,
                    email: 0,
                    coverImage: 0,
                    password: 0,
                    createdAt: 0,
                    updatedAt: 0,
                    __v: 0,
                    refreshtoken: 0,
                },
            },
        },
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                likedVideos,
                "liked videos fetched successfully"
            )
        );

})

const isLikedVideo = asyncHandler(async (req, res) => {
    // Todo get status whether that video is liked or not by that user
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}