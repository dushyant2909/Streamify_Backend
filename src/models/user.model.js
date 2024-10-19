import mongoose, { Schema } from "mongoose";
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

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

// Pre-hook to hash password
userSchema.pre("save", function (next) {
    if (!this.isModified("password"))
        return next();

    this.password = bcrypt.hash(this.password, 10)
    next();
})

// Some methods
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

console.log("In user model", process.env.ACCESS_TOKEN_SECRET)

userSchema.methods.generateAccessToken = async function () {
    return jwt.sign(
        // Create a payload
        {
            id: this._id,
            email: this.email,
            username: this.username
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = async function () {
    return jwt.sign(
        // Create a payload
        {
            id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema)