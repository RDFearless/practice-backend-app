import { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;
    if(!content?.trim().length) {
        throw new ApiError(400, "Tweet is empty");
    }
    
    const userId = req.user._id;
    
    const tweet = await Tweet.create(
        {
            content: content.trim(),
            owner: userId
        }
    );
    
    return res
    .status(201)
    .json(
        new ApiResponse(
            201,
            tweet,
            "Tweet created"
        )
    );
});

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    if(!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId");
    }
    const userExists = await User.exists({ _id: userId });
    if(!userExists) {
        throw new ApiError(404, "User not found");
    }
    
    const tweets = await Tweet
    .find({ owner: userId })
    .select("-owner")
    .lean();
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                user: userId,
                tweetCount: tweets.length,
                tweets
            },
            "Tweets fetched"
        )
    );
});

const updateTweet = asyncHandler(async (req, res) => {
    const {content} = req.body;
    const {tweetId} = req.params;
    if(!content) {
        throw new ApiError(400, "Content can't be empty");
    }
    if(!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweetId");
    }
    
    const userId = req.user._id;
    const tweet = await Tweet.findById(tweetId);
    if(!tweet) {
        throw new ApiError(404, "Tweet not found");
    }
    if(tweet.owner.toString() !== userId.toString()) {
        throw new ApiError(401, "Unauthorized request");
    }
    
    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        { $set: { content: content }},
        { new: true }
    );
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            updatedTweet,
            "Tweet updated"
        )
    );
});

const deleteTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params;
    if(!isValidObjectId(tweetId)) {
        throw new ApiError(400, "invalid tweetId");
    }
    
    const userId = req.user._id;
    const tweet = await Tweet.findById(tweetId);
    if(!tweet) {
        throw new ApiError(404, "Tweet not found");
    }
    if(tweet.owner.toString() !== userId.toString()) {
        throw new ApiError(401, "Unauthorized request");
    }
    
    const deletedResponse = await Tweet.deleteOne({ _id: tweetId });
    if(deletedResponse.deletedCount === 0) {
        throw new ApiError(500, "Tweet not deleted");
    }
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            { isDeleted: true },
            "Tweet deleted"
        )
    );
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}