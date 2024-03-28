import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js"
import mongoose, { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import ApiResponse from "../utils/ApiResponse.js";


const toggleSubscription = asyncHandler(async (req, res) => {
    // S-1 take channel id from url which you search and user id from request (as you login)
    // S-2 validate ids and convert to mongodb comparable id
    // S-3 check whether user has previously subscribed or not 
    // S-4 if subscribed then delete the entry 
    // S-5 if not subscribed then create an entry
    // S-6 Return response suitably

    // S-1
    const { channelId } = req.params;
    const userId = req.user?._id;

    // S-2
    if (!isValidObjectId(channelId))
        throw new ApiError(400, "Invalid channel id")

    // S-3 Can be done from just a database check
    const isSubscribed = await Subscription.findOne({
        subscriber: userId,
        channel: channelId
    })

    // S-4 Delete the object which is created in subscriptions model so get that doc id
    if (isSubscribed) {
        await Subscription.findByIdAndDelete({
            _id: isSubscribed?._id
        })

        return res.status(200)
            .json(
                new ApiResponse(
                    200,
                    { subscribed: false },
                    "Unsubscribed successfully"
                )
            )
    }

    // Else part will be done
    await Subscription.create({
        subscriber: userId,
        channel: channelId
    })

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                { subscribed: true },
                "Subscribed successfully"
            )
        )
})

// controller to return subscriber list of a channel
const getChannelSubscribers = asyncHandler(async (req, res) => {
    // S-1 Get channel id from url for whom you want to search
    // S-2 Validate id and convert to mongodb comparable id
    // S-3 Use pipelined to retrieve info
    // S-4 Send response

    // S-1
    const { channelId } = req.params;

    // S-2
    if (!isValidObjectId(channelId))
        throw new ApiError(400, "Invalid Channel id");

    const channelSearchId = new mongoose.Types.ObjectId(channelId);

    // S- 3
    const subscribersList = await Subscription.aggregate([
        {
            $match: {
                channel: channelSearchId
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "SubscriberInformation",
            },
        },
        {
            $addFields: {
                SubscribersInformation: {
                    $first: "$SubscriberInformation",
                },
            },
        },
        {
            $project: {
                _id: 0,
                SubscriberInformation: {
                    _id: 1,
                    username: 1,
                    fullName: 1
                }
            }
        }
    ])

    // S-4
    res.status(200)
        .json(
            new ApiResponse(200,
                subscribersList,
                "Subscribers list fetched successfully")
        )

})

// controller to return channel list to which logged-in user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    // S-1 get subscriber id (logged in user id) to find the channels which he has subscribed
    // S-2 Validate id
    // left join subscriber model with user to find full info of subscribed channels
    // 

    // S-1
    const { subscriberId } = req.params

    // S-2
    if (!isValidObjectId(subscriberId))
        throw new ApiError(400, "Invalid subscriber id")

    const subscriberId_For_checking = new mongoose.Types.ObjectId(subscriberId);

    const subscribedChannels = await Subscription.aggregate([
        [
            {
                $match: {
                    subscriber: subscriberId_For_checking
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "channel",
                    foreignField: "_id",
                    as: "subscribedChannelInfo",
                },
            },
            {
                $addFields: {
                    subscribedChannels: {
                        $first: "$subscribedChannelInfo",
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    subscribedChannelInfo: {
                        _id: 1,
                        username: 1,
                        fullName: 1,
                    },
                },
            },
        ]
    ]);


    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscribedChannels,
                "subscribed channels fetched successfully"
            )
        );
})

export { toggleSubscription, getChannelSubscribers, getSubscribedChannels }