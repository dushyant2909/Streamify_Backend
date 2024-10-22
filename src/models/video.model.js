import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000
    },
    url: {
        type: String,
        required: true
    },
    videoUrlPublicId: {
        type: String,
        required: true
    },
    thumbnail: {
        type: String, // URL of the video's thumbnail image
        required: true
    },
    videoThumbnailPublicId: {
        type: String,
        required: true
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tags: {
        type: [String], // Array of tags for categorization
        default: []
    },
    likes: {
        type: Number,
        default: 0
    },
    dislikes: {
        type: Number,
        default: 0
    },
    views: {
        type: Number,
        default: 0
    },
    duration: {
        type: Number, // Duration of the video in seconds
        required: true
    },
    visibility: {
        type: String,
        enum: ['public', 'private', 'unlisted'], // Video visibility options
        default: 'public'
    },
    category: {
        type: String, // Category of the video (e.g., "Music", "Education")
        required: true
    }
}, {
    timestamps: true
})

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model('Video', videoSchema)