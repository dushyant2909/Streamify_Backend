import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true// For seamless searching using username
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        unique: true,
        trim: true,
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    password: {
        type: String,
        required: ['Password is required', true]
    },
    profileImage: {
        type: String,
        required: true
    },
    bannerImage: {
        type: String,
        default: null
    },
    bio: {
        type: String,
        trim: true, // trim any extra spaces
        maxlength: 255
    },
    premiumSubscription: {
        type: Boolean,
        default: false
    },
    socialLinks: [{
        platform: {
            type: String,
            trim: true
        },
        url: {
            type: String,
            trim: true
        }
    }],
    watchHistory: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video" // same as the export name in model
        }
    ],
    subscribersCount: {
        type: Number,
        default: 0
    },
    refreshToken: {
        type: String
    }
}, {
    timestamps: true
})

export const User = mongoose.model("User", userSchema)