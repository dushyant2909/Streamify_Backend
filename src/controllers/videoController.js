import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinaryFileUpload.js";
import { Like } from "../models/like.model.js";
import deleteFileFromCloudinary from "../utils/deleteFileFromCloudinary.js";

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

const updateVideoDetails = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!videoId)
        throw new ApiError(404, "Video id is required")
    if (!isValidObjectId(videoId))
        throw new ApiError(400, "Invalid video id")

    const userId = req.user._id;

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Validate owner
    if (video.creator.toString() !== userId.toString()) {
        throw new ApiError(403, "You do not have permission to update this video");
    }
    const updateFields = {};

    if (req.body.title) updateFields.title = req.body.title;
    if (req.body.description) updateFields.description = req.body.description;
    if (req.body.tags) updateFields.tags = req.body.tags
    if (req.body.visibility) updateFields.visibility = req.body.visibility
    if (req.body.category) updateFields.category = req.body.category

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        updateFields,
        {
            new: true
        }
    ).select("-videoThumbnailPublicId -videoUrlPublicId")

    return res.status(200)
        .json(new ApiResponse(200,
            updatedVideo,
            "Video details updated successfully"
        ))
})

const updateVideoThumbnail = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!videoId)
        throw new ApiError(404, "Video id is required")
    if (!isValidObjectId(videoId))
        throw new ApiError(400, "Invalid video id")

    const userId = req.user._id;

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Validate owner
    if (video.creator.toString() !== userId.toString()) {
        throw new ApiError(403, "You do not have permission to update this video");
    }

    if (!req.files || !req.files.thumbnail) {
        throw new ApiError(400, "Thumbnail image is required");
    }

    const oldPublicId = video.videoThumbnailPublicId;
    await deleteFileFromCloudinary(oldPublicId)

    let thumbnailImageUrl = null;
    let thumbnailPublicId = null;

    const thumbnailImageFilePath = req.files.thumbnail[0].path;
    const thumbnailUpload = await uploadOnCloudinary(thumbnailImageFilePath)
    if (thumbnailUpload) {
        thumbnailImageUrl = thumbnailUpload.secure_url
        thumbnailPublicId = thumbnailUpload.public_id
    }

    video.thumbnail = thumbnailImageUrl;
    video.videoThumbnailPublicId = thumbnailPublicId

    await video.save();

    const updatedVideo = await Video.findById(video._id)
        .select("-videoThumbnailPublicId -videoUrlPublicId")

    return res.status(200).json(
        new ApiResponse(200, updatedVideo, "Video thumbnail updated successfully")
    )
})

const deleteVideo = async (req, res, next) => {
    const session = await mongoose.startSession();
    await session.startTransaction(); // Start the transaction
    try {
        const { videoId } = req.params;

        if (!videoId) {
            throw new ApiError(401, "Video id is required");
        }

        if (!isValidObjectId(videoId)) {
            throw new ApiError(401, "Invalid video id");
        }

        const userId = req.user._id;

        const video = await Video.findById(videoId).session(session);
        if (!video) {
            throw new ApiError(404, "Video not found");
        }

        if (video.creator.toString() !== userId.toString()) {
            throw new ApiError(403, "You do not have permission to delete this video");
        }

        // Delete likes/dislikes record for that video
        await Like.deleteMany({ video: videoId }).session(session);

        // Delete the video
        await Video.findByIdAndDelete(
            videoId
        ).session(session)

        await session.commitTransaction(); // Commit the transaction
        return res.status(200).json(new ApiResponse(200, {}, "Video deleted successfully"));
    } catch (error) {
        await session.abortTransaction(); // Rollback on error
        next(error); // Pass the error to the next middleware
    } finally {
        session.endSession(); // End the session
    }
};

export {
    uploadVideo,
    toggleVideoLikeDislike,
    updateVideoDetails,
    updateVideoThumbnail,
    deleteVideo
}