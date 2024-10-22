import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinaryFileUpload.js";
import { Like } from "../models/like.model.js";

const uploadVideo = asyncHandler(async (req, res) => {
    const { title, description, visibility, category, tags } = req.body;

    if (!title || !description || !category)
        throw new ApiError(400, "All fields are required");

    const userId = req.user._id;

    let videoUrl = null;
    let videoPublicId = null;
    let videoDuration = 0;
    let videoThumbnail = null;
    let videoThumbnailPublicId = null;

    if (req.files?.url) {
        const videoUrlFilePath = req.files.url[0].path;
        const videoFileUpload = await uploadOnCloudinary(videoUrlFilePath);
        if (videoFileUpload) {
            videoUrl = videoFileUpload.secure_url;
            videoPublicId = videoFileUpload.public_id
            videoDuration = videoFileUpload.duration;
        }
    }

    if (req.files?.thumbnail) {
        const thumbnailFilePath = req.files.thumbnail[0].path;
        const thumbnailUpload = await uploadOnCloudinary(thumbnailFilePath);
        if (thumbnailUpload) {
            videoThumbnail = thumbnailUpload.secure_url;
            videoThumbnailPublicId = thumbnailUpload.public_id;
        }
    }

    const video = await Video.create({
        title,
        description,
        url: videoUrl,
        videoUrlPublicId: videoPublicId,
        thumbnail: videoThumbnail,
        videoThumbnailPublicId,
        creator: userId,
        tags,
        duration: videoDuration,
        visibility,
        category
    })

    return res.status(201)
        .json(new ApiResponse(201, video, "Video uploaded successfully"))

})

const toggleVideoLikeDislike = asyncHandler(async (req, res) => {
    // Here type is whether user like or dislike a video
    const { videoId, type } = req.body;
    const userId = req.user._id;

    if (!videoId || !type)
        throw new ApiError(401, "All fields are required")

    if (!isValidObjectId(videoId))
        throw new ApiError(401, "Invalid video id")

    const video = await Video.findById(videoId)
    if (!video)
        throw new ApiError(401, "Video not found with this id")

    const likedStatus = await Like.findOne({
        video: new mongoose.Types.ObjectId(videoId),
        user: userId
    })

    // If any entry found then toggle the type
    if (likedStatus) {
        // If the user is toggling between like and dislike
        if (likedStatus.type === type) {
            // Remove the like/dislike if it is the same action
            await Like.findByIdAndDelete(likedStatus._id);

            if (type === "like")
                video.likes = Math.max(0, video.likes - 1);
            else
                video.dislikes = Math.max(0, video.dislikes - 1);
        }
        else {
            // Update the like/dislike to the new type
            likedStatus.type = type;
            await likedStatus.save();

            if (type === "like") {
                video.likes += 1;
                video.dislikes = Math.max(0, video.dislikes - 1);
            }
            else {
                video.dislikes += 1;
                video.likes = Math.max(0, video.likes - 1)
            }
        }
    }
    // If entry not found then create an entry in db
    else {
        await Like.create({
            video: new mongoose.Types.ObjectId(videoId),
            user: userId,
            type
        })

        if (type === "like")
            video.likes += 1;
        else
            video.dislikes += 1;
    }

    await video.save()

    return res.status(200).json(
        new ApiResponse(201, {}, `Video ${type}d successfully`)
    )
})

export {
    uploadVideo,
    toggleVideoLikeDislike
}