import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from '../models/user.model.js'
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinaryFileUpload.js";
import fs from 'fs'

const registerUser = asyncHandler(async (req, res) => {
    const { username, fullName, password, email, bio, socialLinks } = req.body;

    // Validate required fields
    if (!username || !fullName || !email || !password) {
        throw new ApiError(400, 'All fields are required');
    }

    // Check if user already exists by username or email
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        if (req.files?.profileImage)
            fs.unlinkSync(req.files.profileImage[0].path)
        if (req.files?.bannerImage)
            fs.unlinkSync(req.files.bannerImage[0].path)
        throw new ApiError(409, "User with email or username already exists");
    }

    // Handle profile image and banner image
    let profileImageUrl = null;
    let bannerImageUrl = null;

    if (req.files?.profileImage) {
        // If profileImage is uploaded, process the file
        const profileImageFilePath = req.files.profileImage[0].path;
        const profileImageUpload = await uploadOnCloudinary(profileImageFilePath);
        if (profileImageUpload) {
            profileImageUrl = profileImageUpload.secure_url;
        }
    }

    if (req.files?.bannerImage) {
        // If bannerImage is uploaded, process the file (optional)
        const bannerImageFilePath = req.files.bannerImage[0].path;
        const bannerImageUpload = await uploadOnCloudinary(bannerImageFilePath);
        if (bannerImageUpload) {
            bannerImageUrl = bannerImageUpload.secure_url;
        }
    }

    const user = await User.create({
        username,
        fullName,
        email,
        password,
        profileImage: profileImageUrl,
        bannerImage: bannerImageUrl,
        bio,
        socialLinks
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshtoken"  // use - to deselect
    )

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    )
})

export {
    registerUser
}