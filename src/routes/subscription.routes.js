import { Router } from "express";
import {
    toggleSubscription,
    getSubscribedChannels,
    getChannelSubscribers
} from "../controllers/subscription.controller.js"

import { verifyJWT } from "../middlewares/auth.middleware.js";

const subscriptionRoutes = Router();

subscriptionRoutes.use(verifyJWT) // To ensure every route is after login
// Protected routes all
// apply verifyJWT to alll routes in this file

// subscriptionRoutes
//     .route("/c/:channelId")
//     // .get(getChannelSubscribers) // How many channel user has subscribed (List of channels to which user has subscribed)
//     .post(toggleSubscription);

subscriptionRoutes.route("/u/:subscriberId").get(getSubscribedChannels); // How many other users
// have subscribed the channel (To find no. of subscribers list of a channel)

subscriptionRoutes.route("/c/:channelId").get(getChannelSubscribers);

subscriptionRoutes.route("/c/:channelId").post(toggleSubscription);

export default subscriptionRoutes