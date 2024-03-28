import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const subscriptionSchema = new mongoose.Schema({
    subscriber: { // One who subscribe your channel
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    channel: { // One to whom you have subscribed the channel
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, {
    timestamps: true
})

subscriptionSchema.plugin(mongooseAggregatePaginate);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);