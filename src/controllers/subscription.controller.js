import {isValidObjectId} from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

// modify below list to change API response
const USER_POPULATE_EXCLUDED_FIELDS = "-password -refreshToken -email -coverImage -watchHistory";

const toggleSubscription = asyncHandler(async (req, res) => {
    // get data
    const {channelId} = req.params
    const userId = req.user._id;
    
    // validation
    if(!channelId) {
        throw new ApiError(400, "channelId missing");
    }
    if(!isValidObjectId(channelId)) {
        throw new ApiError(400, "invalid channelId");
    }
    
    // find subscriber with channelId and userId
    const isSubscribed = await Subscription.exists({ channel: channelId, subscriber: userId });  
        
    // if subscribed -> unsubscribe
    if(isSubscribed) {
        await Subscription.deleteOne({ channel: channelId, subscriber: userId });
        
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    isSubscribed: false
                },
                "Unsubscribed from channel"
            )
        );
    }
    
    // else create one such document
    await Subscription.create(
        {
            subscriber: userId,
            channel: channelId
        }
    )
    
    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                {
                    isSubscribed: true
                },
                "Subscribed to channel"
            )
        );
});

// controller to return subscriber list of a channel
const getSubscribersOfChannel  = asyncHandler(async (req, res) => {    
    // get data
    const {channelId} = req.params
    
    // validation
    if(!channelId) {
        throw new ApiError(400, "channelId missing");
    }
    if(!isValidObjectId(channelId)) {
        throw new ApiError(400, "invalid channelId");
    }
    
    // check if channel exists
    const channelExists = await User.exists({_id: channelId});
    if(!channelExists) {
        throw new ApiError(404, "Channel not found");
    }
    
    // get all documents with channel == channelId
    const subscribers = await Subscription
    .find({channel: channelId})
    .select("-channel") // repeatitive
    .populate("subscriber", USER_POPULATE_EXCLUDED_FIELDS)
    .lean();
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200, 
            {
                channel: channelId,
                subscribers
            }, 
            "Subscriber list of a channel"
        )
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    
    // validation
    if(!subscriberId) {
        throw new ApiError(400, "subscriberId missing");
    }
    if(!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "invalid subscriberId");
    }
    
    // check if subscriber exists
    const subscriberExists = await User.exists({_id: subscriberId});
    if(!subscriberExists) {
        throw new ApiError(404, "Subscriber not found");
    }
    
    // get all documents with subscriber == subscriberId
    const channels = await Subscription
    .find({subscriber: subscriberId})
    .select("-subscriber") // repeatitive
    .populate("channel", USER_POPULATE_EXCLUDED_FIELDS)
    .lean();
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200, 
            {
                subscriber: subscriberId,
                channels
            }, 
            "Channel list of a subscriber"
        )
    );
});

export {
    toggleSubscription,
    getSubscribersOfChannel,
    getSubscribedChannels
}