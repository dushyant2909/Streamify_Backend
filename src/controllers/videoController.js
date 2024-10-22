import { Video } from "../models/video.model.js";
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinaryFileUpload.js";

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

export { uploadVideo }