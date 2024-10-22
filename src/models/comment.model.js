import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    video: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video',
        required: true
    },
    text: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    likes: {
        type: Number,
        default: 0  // Number of likes the comment received, default 0
    },
    replies: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'   // Reference to the user who made the reply
        },
        text: {
            type: String,    // Reply text
            required: true,  // Reply cannot be empty
            trim: true,
            maxlength: 1000  // Limit the reply length
        },
        createdAt: {
            type: Date,
            default: Date.now // Timestamp for when the reply was made
        }
    }]
},
    {
        timestamps: true
    })

commentSchema.plugin(mongooseAggregatePaginate)

export const Comment = mongoose.model('Comment', commentSchema)
