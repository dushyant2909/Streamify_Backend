import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from '../models/user.model.js'
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinaryFileUpload.js";
import fs from 'fs';
import jwt from 'jsonwebtoken'
import deleteFileFromCloudinary from "../utils/deleteFileFromCloudinary.js";

// Generate access and refresh token function
const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        if (!user)
            throw new ApiError(409, "User not found for given user id while generating token")

        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false }); // means do not apply validation and just save

        return {
            accessToken,
            refreshToken
        }

    } catch (error) {
        console.log("Error while generating token::", error)
        throw new ApiError(500, `Something went wrong while generating refresh and access token :: ${error?.message}`);
    }
}

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
    let profileImagePublicId = null;
    let bannerImageUrl = null;
    let bannerImagePublicId = null;

    if (req.files?.profileImage) {
        // If profileImage is uploaded, process the file
        const profileImageFilePath = req.files.profileImage[0].path;
        const profileImageUpload = await uploadOnCloudinary(profileImageFilePath);
        if (profileImageUpload) {
            profileImageUrl = profileImageUpload.secure_url;
            profileImagePublicId = profileImageUpload.public_id;
        }
    }

    if (req.files?.bannerImage) {
        // If bannerImage is uploaded, process the file (optional)
        const bannerImageFilePath = req.files.bannerImage[0].path;
        const bannerImageUpload = await uploadOnCloudinary(bannerImageFilePath);
        if (bannerImageUpload) {
            bannerImageUrl = bannerImageUpload.secure_url;
            bannerImagePublicId = bannerImageUpload.public_id;
        }
    }

    const user = await User.create({
        username,
        fullName,
        email,
        password,
        profileImage: profileImageUrl,
        profileImagePublicId,
        bannerImage: bannerImageUrl,
        bannerImagePublicId,
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

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(400, 'All fields are required');
    }

    const user = await User.findOne({ email })
    if (!user)
        throw new ApiError(409, "User not found, kindly register yourself")

    // Validate password
    const isPasswordCorrect = await user.isPasswordCorrect(password)
    if (!isPasswordCorrect)
        throw new ApiError(401, "Incorrect Password")

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    // Cookie options
    const options = {
        httpOnly: true, // Prevents client-side access to the cookie
        secure: process.env.NODE_ENV === 'production', // true in production, false in dev
        sameSite: 'strict', // Helps mitigate CSRF attacks
    }

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refreshToken
                },
                "User logged in successfully"
            )
        )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    // Either get it from cookies or from body (in mobile apps)
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken)
        throw new ApiError(401, "Refresh token is required")

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
        )

        const user = await User.findById(decodedToken?._id)
        if (!user)
            throw new ApiError(401, "Invalid refresh token");

        if (incomingRefreshToken !== user.refreshToken)
            throw new ApiError(401, "Refresh token expired or invalid");

        const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshToken(user._id)

        // Cookie options
        const options = {
            httpOnly: true, // Prevents client-side access to the cookie
            secure: process.env.NODE_ENV === 'production', // true in production, false in dev
            sameSite: 'strict', // Helps mitigate CSRF attacks
        }

        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refreshToken: newRefreshToken
                    },
                    "Access token refreshed successfully"
                )
            )

    } catch (error) {
        console.error("Error refreshing access token:", error);
        throw new ApiError(500, "Something went wrong while refreshing access token")
    }

})

const logoutUser = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const user = await User.findByIdAndUpdate(userId,
        {
            $unset: {
                refreshToken: 1 // this will remove that field from the document
            }
        },
        {
            new: true
        }
    )

    if (!user)
        throw new ApiError(401, "User not found")

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict"
    }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"))
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword)
        throw new ApiError(401, "All fields are required")

    const userId = req.user._id;

    const user = await User.findById(userId)
    if (!user)
        throw new ApiError(401, "User not found")

    const passwordCheck = await user.isPasswordCorrect(currentPassword);
    if (!passwordCheck)
        throw new ApiError(400, "Incorrect Current Password")

    user.password = newPassword;

    await user.save({
        validateBeforeSave: false
    })

    return res.status(200)
        .json(new ApiResponse(200, {}, "Password updated successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const user = await User.findById(userId)
        .select("-password -refreshToken");
    if (!user)
        throw new ApiError(401, "User not found")

    return res.status(200)
        .json(new ApiResponse(200,
            user,
            "Current user accessed successfully"
        ))
})

const updateUserProfile = asyncHandler(async (req, res) => {
    const userId = req.user._id; // Assuming you have middleware for authentication

    // Build an object dynamically to hold the fields that need updating
    const updateFields = {};

    // Only add the fields to the update object if they are provided
    if (req.body.fullName) updateFields.fullName = req.body.fullName;
    if (req.body.bio) updateFields.bio = req.body.bio;
    if (req.body.socialLinks) updateFields.socialLinks = req.body.socialLinks;

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        updateFields, // dynamically built object
        {
            new: true, // Return the updated document
            runValidators: true // Apply validators defined in the schema
        }
    ).select('-password -refreshToken'); // Exclude sensitive fields

    if (!updatedUser) {
        throw new ApiError(404, 'User not found');
    }

    return res.status(200)
        .json(new ApiResponse(200,
            updatedUser,
            "Account details updated successfully"
        ))
})

const updateUserProfileImage = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    if (!req.files || !req.files.profileImage) {
        throw new ApiError(400, "Profile image is required");
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (user.profileImage) {
        const oldPublicId = user.profileImagePublicId;
        if (oldPublicId)
            await deleteFileFromCloudinary(oldPublicId)
    }

    let profileImageUrl = null;
    let profileImagePublicId = null;

    const profileImageFilePath = req.files.profileImage[0].path;
    const profileImageUpload = await uploadOnCloudinary(profileImageFilePath);
    if (profileImageUpload) {
        profileImageUrl = profileImageUpload.secure_url;
        profileImagePublicId = profileImageUpload.public_id;
    }

    user.profileImage = profileImageUrl;
    user.profileImagePublicId = profileImagePublicId

    await user.save()

    const updatedUser = await User.findById(userId).select("-password -refreshToken");

    return res.status(200)
        .json(new ApiResponse(200, updatedUser, "Profile image updated successfully"))
})

const updateUserBannerImage = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    if (!req.files || !req.files.bannerImage) {
        throw new ApiError(400, "Banner image is required");
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (user.bannerImage) {
        const oldPublicId = user.bannerImagePublicId;
        if (oldPublicId)
            await deleteFileFromCloudinary(oldPublicId)
    }

    let bannerImageUrl = null;
    let bannerImagePublicId = null;

    const bannerImageFilePath = req.files.bannerImage[0].path;
    const bannerImageUpload = await uploadOnCloudinary(bannerImageFilePath);
    if (bannerImageUpload) {
        bannerImageUrl = bannerImageUpload.secure_url;
        bannerImagePublicId = bannerImageUpload.public_id;
    }

    user.bannerImage = bannerImageUrl;
    user.bannerImagePublicId = bannerImagePublicId;

    await user.save()

    const updatedUser = await User.findById(userId).select("-password -refreshToken");

    return res.status(200)
        .json(new ApiResponse(200, updatedUser, "Banner image updated successfully"))
})

export {
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    changeCurrentPassword,
    getCurrentUser,
    updateUserProfile,
    updateUserProfileImage,
    updateUserBannerImage
}