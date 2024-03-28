import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import ApiError from "../utils/ApiError.js"
import ApiResponse from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinaryFileUpload.js"
import deleteFileFromCloudinary from "../utils/deleteFileFromCloudinary.js"
import { Like } from "../models/likes.model.js"

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
    const pipeline = [];

    // for using Full Text based search u need to create a search index in mongoDB atlas
    // you can include field mapppings in search index eg.title, description, as well
    // Field mappings specify which fields within your documents should be indexed for text search.
    // this helps in seraching only in title, desc providing faster search results
    // here the name of search index is 'search-videos'
    if (query) {
        pipeline.push({
            $search: {
                index: "search-videos",
                text: {
                    query: query,
                    path: ["title", "description"] //search only on title, desc
                }
            }
        });
    }

    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid userId");
        }

        pipeline.push({
            $match: {
                videoOwner: new mongoose.Types.ObjectId(userId)
            }
        });
    }

    // fetch videos only that are set isPublished as true
    pipeline.push({ $match: { isPublished: true } });

    //sortBy can be views, createdAt, duration
    //sortType can be ascending(-1) or descending(1)
    if (sortBy && sortType) {
        pipeline.push({
            $sort: {
                [sortBy]: sortType === "asc" ? 1 : -1
            }
        });
    } else {
        pipeline.push({ $sort: { createdAt: -1 } });
    }

    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "videoOwner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$ownerDetails"
        }
    )

    const videoAggregate = Video.aggregate(pipeline);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const video = await Video.aggregatePaginate(videoAggregate, options);

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Videos fetched successfully"));
})

const publishAVideo = asyncHandler(async (req, res) => {
    // S-1: Get video information from req.body and video from req.file
    // S-2: Validate the video
    // S-3: upload on cloudinary
    // S-4: Also add user-owner who has published video save video in video-controller

    // S-1
    const { title, description } = req.body

    if (!title || !description)
        throw new ApiError(400, "All fields are required");

    // const { videoFile, thumbnail } = req.files;
    let videoFileLocalPath;
    if (req.files && Array.isArray(req.files.videoFile) && req.files.videoFile.length > 0) {
        videoFileLocalPath = req.files?.videoFile[0]?.path;
    }

    let thumbnailLocalPath;
    if (req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0) {
        thumbnailLocalPath = req.files?.thumbnail[0]?.path;
    }

    // S-2
    if (!videoFileLocalPath)
        throw new ApiError(400, "Video-file local-path is required")

    if (!thumbnailLocalPath)
        throw new ApiError(400, "Thumbnail file local-path is required")

    // S-3
    const videoFileCloudinary = await uploadOnCloudinary(videoFileLocalPath);

    const thumbnailCloudinary = await uploadOnCloudinary(thumbnailLocalPath);

    if (!videoFileCloudinary)
        throw new ApiError("Error in getting video file upload response from cloudinary")

    if (!thumbnailCloudinary)
        throw new ApiError("Error in getting thumbnail upload response from cloudinary")

    const userId = req.user?._id;

    // S-4
    const videoDetails = await Video.create({
        videoFile: videoFileCloudinary?.secure_url,
        thumbnail: thumbnailCloudinary?.url,
        title,
        description,
        duration: videoFileCloudinary?.duration,
        videoOwner: userId,
        isPublished: false
    })

    const uploadedVideo = await Video.findById(videoDetails._id)

    if (!uploadedVideo) {
        throw new ApiError(500, "Something went wrong while publishing video")
    }

    return res.status(200).
        json(new ApiResponse(200, uploadedVideo, "Video uploaded successfully"))

})

const getVideoById = asyncHandler(async (req, res) => {
    // S-1 get video id from url which you want to watch
    // S-2 validate id and convert it into mongodb comparable id
    // S-3 find video and extract user info, likes info also using pipeline
    // S-4 Add that video to watch history of logged in user
    // S-5 Increment the view counts for that video
    // S-6 Add that video to watch history of user
    // return response

    // S-1
    const { videoId } = req.params;

    // S-2
    if (!isValidObjectId(videoId))
        throw new ApiError(400, "Invalid Video id");

    const videoFound = await Video.findById(videoId);

    if (!videoFound)
        throw new ApiError(404, "Video not found")

    const videoId_forMongoDB = new mongoose.Types.ObjectId(videoId);

    // S-3
    // TODO:: fetch likes info
    const video = await Video.aggregate([
        [
            {
                $match: {
                    _id: videoId_forMongoDB,
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "videoOwner",
                    foreignField: "_id",
                    as: "videoOwner",
                },
            },
            {
                $addFields: {
                    videoOwner: {
                        $first: "$videoOwner",
                    },
                },
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "videoOwner._id",
                    foreignField: "channel",
                    as: "OwnerSubscribers",
                },
            },
            {
                $addFields: {
                    isSubscribed: {
                        $in: [
                            req.user?._id,
                            "$OwnerSubscribers.subscriber",
                        ],
                    },
                },
            },
            {
                $addFields: {
                    OwnerSubscribers: {
                        $size: "$OwnerSubscribers",
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    isPublished: 0,
                    updatedAt: 0,
                    __v: 0,
                    videoOwner: {
                        _id: 0,
                        watchHistory: 0,
                        createdAt: 0,
                        updatedAt: 0,
                        password: 0,
                        email: 0,
                        refreshtoken: 0,
                        coverImage: 0,
                        __v: 0,
                    },
                }
            }
        ]
    ]);

    if (!video)
        throw new ApiError(404, "Video not found")

    // S-4 & S-5
    // increment views if video fetched successfully also will not add again if already added
    await Video.findByIdAndUpdate(videoId, {
        $inc: {
            views: 1
        }
    });

    // S-6 add this video to user watch history
    await User.findByIdAndUpdate(req.user?._id, {
        $addToSet: {
            watchHistory: videoId
        }
    });

    return res.status(200)
        .json(new ApiResponse(200, video[0], "Video fetched successfully"));
})

const updateVideo = asyncHandler(async (req, res) => {
    // S-1: take video id to be updated from url and validate id and search first the video
    // S-2: take updated credentials
    // S-3: Check first that video owner is updating or not
    // S-4: Fetch old thumbnail to be deleted from video model
    // S-5: Upload new thumbnail to cloudinary first
    // S-6: Before deleting old thumbnail first update the video
    // S-7: After successful updation delete old thumbnail

    // S-1
    const { videoId } = req.params

    if (!isValidObjectId(videoId))
        throw new ApiError(401, "Invalid video id");

    const videoFound = await Video.findById(videoId);

    if (!videoFound)
        throw new ApiError(404, "Video not found");

    // S-2
    const { description, title } = req.body;

    if (!description || !title)
        throw new ApiError(401, "Fields to be updated are reauired")

    const thumbnailLocalPath = req.file?.path;

    if (!thumbnailLocalPath)
        throw new ApiError(400, "Thumbnail file is missing")

    // S-3
    if (videoFound?.videoOwner.toString() !== req.user?._id.toString()) {
        throw new ApiError(
            400,
            "You can not edit this video as you are not the owner"
        );
    }

    // S-4
    const oldThumbnail = videoFound.thumbnail;

    if (!oldThumbnail)
        throw new ApiError(401, "Old thumbnail not found");

    // S-5
    const thumbnailCloudinary = await uploadOnCloudinary(thumbnailLocalPath);

    if (!thumbnailCloudinary.url)
        throw new ApiError(401, "Error in uploading thumbnail to cloudinary")

    // S-6
    const updatedVideo = await Video.findByIdAndUpdate(
        { _id: videoId },
        {
            $set: {
                description,
                title,
                thumbnail: thumbnailCloudinary.url
            }
        },
        {
            new: true
        })

    if (!updatedVideo)
        throw new ApiError(401, "Error in updating video details")

    // S-7
    const deleteOldThumbnail = await deleteFileFromCloudinary(oldThumbnail);

    if (deleteOldThumbnail.result !== "ok")
        throw new ApiError(400, "Error in deleting previous thumbnail")

    return res.status(200)
        .json(new ApiResponse(200, updatedVideo,
            "Video updated successfully"))

})

// TODO:: delete the comments entry for that video
// TODO: modify the delete utility for video
const deleteVideo = asyncHandler(async (req, res) => {
    // S-1: Get video id to be deleted and validate id also find the video
    // S-2: Check whether owner is deleting or not
    // S-3: Delete video file from Database then delete it from cloudinary
    // S-4: Delete thumbnail from cloudinary
    // S-5: Delete video file from cloudinary
    // S-6: Delete likes entry for that video
    // S-7: Delete comments also for that video

    // S-1:
    const { videoId } = req.params

    if (!isValidObjectId(videoId))
        throw new ApiError(401, "Invalid video id");

    const videoFind = await Video.findById(videoId);

    if (!videoFind)
        throw new ApiError(404, "Video not found")

    // S-2
    if (videoFind.videoOwner?.toString() !== req.user?._id.toString())
        throw new ApiError(401, "You can not delete this video as you are not the owner")

    // S-3:
    const videoDelete = await Video.findByIdAndDelete(videoFind?._id);

    if (!videoDelete)
        throw new ApiError("Error in deleting video from Database")

    // S-3
    const thumbnail = videoFind.thumbnail;

    if (!thumbnail)
        throw new ApiError(404, "Thumbnail not found");

    const thumbnailDeleteResponse = await deleteFileFromCloudinary(thumbnail);

    if (thumbnailDeleteResponse.result !== "ok")
        throw new ApiError(401, "Error in deleting thumbnail from cloudinary");

    const videoFile = videoFind.videoFile;

    if (!videoFile)
        throw new ApiError(404, "Video file to be deleted not found");

    // Correct it
    // const videoDeleteRespone = await deleteFileFromCloudinary(videoFile, "video");

    // if (videoDeleteRespone.result !== "ok")
    //     throw new ApiError(401, "Error in deleting vidoe file from cloudinary")

    // S-6: Remove likes of that video also
    likesDeleteResponse = await Like.deleteMany({
        video: videoId
    })

    if (!likesDeleteResponse)
        throw new ApiError(401, "Error in deleting likes for that video")

    // S-7: Remove comments also


    return res.status(200, {}, "Video deleted successfully");

})

const togglePublishStatus = asyncHandler(async (req, res) => {
    // S-1: Get video id from url and validate it
    // S-2: Find the video
    // S-3: Check that video owner is toggling
    // S-4: if not published then publish it alter accordingly

    // S-1
    const { videoId } = req.params

    if (!isValidObjectId(videoId))
        throw new ApiError(400, "Invalid video id")

    // S-2
    const videoFound = await Video.findById(videoId);

    if (!videoFound)
        throw new ApiError(404, "Video not found")

    // S-3
    if (videoFound?.videoOwner.toString() !== req.user?._id.toString())
        throw new ApiError(401, "You can not toggle publishing as you are not the owner of the video")

    // S-4
    const publishStatus = videoFound.isPublished;

    const togglePublish = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !publishStatus
            }
        },
        { new: true }
    )

    if (!togglePublish)
        throw new ApiError(401, "Error in toggling publish status in Database")

    return res.status(200)
        .json(new ApiResponse(200,
            {
                isPublished: togglePublish.isPublished
            }
            , "Published toggled successfully"));

})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}