import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { Video } from "../models/video.model.js"
import ApiError from "../utils/ApiError.js"
import ApiResponse from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

// Create playlist
const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body

    if (!name || !description)
        throw new ApiError(401, "Playlist name and description required");

    const userId = req.user._id;

    const playlist = await Playlist.create({
        name,
        description,
        owner: userId
    })

    if (!playlist)
        throw new ApiError(401, "Error in creating playlist in database");

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Playlist created successfully"))

})

// Get user playlists
const getUserPlaylists = asyncHandler(async (req, res) => {
    // const { userId } = req.params
    const userId = req.user._id;

    const playlist = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
            },
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$videos",
                },
                totalViews: {
                    $sum: "$videos.views",
                },
            },
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                totalVideos: 1,
                totalViews: 1,
                createdAt: 1,
            },
        },
    ])

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "User playlists fetched successfully"));

})

// Get playlist by id
const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params

    if (!isValidObjectId(playlistId))
        throw new ApiError(401, "Invalid playlist id");

    const playlistInfo = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
            },
        },
        {
            $match: {
                "videos.isPublished": true,
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
            },
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$videos",
                },
                totalViews: {
                    $sum: "$videos.views",
                },
                owner: {
                    $first: "$owner",
                },
            },
        },
        {
            $project: {
                name: 1,
                description: 1,
                createdAt: 1,
                updatedAt: 1,
                totalVideos: 1,
                totalViews: 1,
                videos: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    createdAt: 1,
                    views: 1,
                },
                owner: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1,
                },
            },
        },
    ])

    return res
        .status(200)
        .json(new ApiResponse(200, playlistInfo[0], "playlist fetched successfully"));
})

// Add video to playlist
const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params

    if (!isValidObjectId(playlistId))
        throw new ApiError(401, "Invalid playlist Id");

    if (!isValidObjectId(videoId))
        throw new ApiError(401, "Invalid Video Id");

    const playlistFound = await Playlist.findById(playlistId);

    if (!playlistFound)
        throw new ApiError(401, "Playlist no found")

    const videoFound = await Video.findById(videoId)

    if (!videoFound)
        throw new ApiError(401, "Video not found");

    if (playlistFound.owner.toString() !== req.user._id.toString())
        throw new ApiError(401, "You can not add video to playlist as you are not the owner")

    const addVideoToPlaylist = await Playlist.findByIdAndUpdate(
        playlistFound._id,
        {
            $addToSet: {
                videos: videoFound._id
            }
        },
        { new: true }
    )

    if (!addVideoToPlaylist)
        throw new ApiError(401, "Error in adding video to playlist in database")

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                addVideoToPlaylist,
                "Added video to playlist successfully"
            )
        );
})

// Remove video from playlist
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params

    if (!isValidObjectId(playlistId))
        throw new ApiError(401, "Invalid playlist id");

    if (!isValidObjectId(videoId))
        throw new ApiError(401, "Invalid video id")

    const playlistFound = await Playlist.findById(playlistId);

    if (!playlistFound)
        throw new ApiError(401, "Playlist not found");

    const videoFound = await Video.findById(videoId);

    if (!videoFound)
        throw new ApiError(401, "Video not found");

    if (playlistFound.owner.toString() !== req.user._id.toString())
        throw new ApiError(401, "You can not Remove video from playlist as you are not the owner")

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistFound._id,
        {
            $pull: {
                videos: videoFound._id
            }
        },
        {
            new: true
        }
    )

    if (!updatedPlaylist)
        throw new ApiError(401, "Error in deleting video from playlist")

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedPlaylist,
                "Video removed from playlist successfully"
            )
        );
})

// Delete playlist
const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params

    if (!isValidObjectId(playlistId))
        throw new ApiError(401, "Invalid playlist id");

    const playlistFound = await Playlist.findById(playlistId);

    if (!playlistFound)
        throw new ApiError(401, "Playlist not found");

    if (playlistFound.owner.toString() !== req.user._id.toString())
        throw new ApiError(401, "You can not Remove video from playlist as you are not the owner")

    const deletePlaylist = await Playlist.findByIdAndDelete(playlistFound._id);

    if (!deletePlaylist)
        throw new ApiError(401, "Error in deleting playlist from Database");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "playlist Deleted successfully"
            )
        );
})

// Update playlist
const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body

    if (!name || !description)
        throw new ApiError(401, "Name or description to be updated not found");

    if (!isValidObjectId(playlistId))
        throw new ApiError(401, "Invalid playlist id");

    const playlistFound = await Playlist.findById(playlistId);

    if (!playlistFound)
        throw new ApiError(401, "Playlist not found");

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistFound._id,
        {
            $set: {
                description,
                name
            }
        },
        {
            new: true
        }
    )

    if (!updatedPlaylist)
        throw new ApiError(401, "Error in updating playlist")

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedPlaylist,
                "Playlist updated successfully"
            )
        );
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}