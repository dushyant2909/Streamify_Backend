import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    video: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video',
    },
    comment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
    },
    type: {
        type: String,
        enum: ['like', 'dislike'],
        required: true
    }
}, {
    timestamps: true
})

export const Like = mongoose.model('Like', likeSchema);