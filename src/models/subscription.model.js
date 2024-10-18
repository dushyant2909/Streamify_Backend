import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema({
    subscriber: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',        // Reference to the user who is subscribing
        required: true
    },
    channel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',        // Reference to the channel (user) being subscribed to
        required: true
    },
},
    {
        timestamps: true
    })

export const Subscription = new mongoose.model('Subscription', subscriptionSchema)