import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const playlistSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxLength: 150
    },
    description: {
        type: String,
        trim: true,
        maxLength: 1000
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    videos: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video'
    }],
    thumbnail: {
        type: String,
        default: null // optional field
    }
}, {
    timestamps: true
})

playlistSchema.plugin(mongooseAggregatePaginate)

export const Playlist = mongoose.model('Playlist', playlistSchema)