import {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {Comment} from "../models/comment.model.js"
import {Video} from "../models/video.model.js"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "invalid videoId");
    }
    
    // Check if video exists
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }
    
    // Check if like already exists
    const likedBy = req.user._id;
    const existingLike = await Like.findOne({
        video: videoId,
        likedBy
    });
    
    // Toggle like (delete if exists, create if doesn't)
    if (existingLike) {
        // Unlike
        await Like.findByIdAndDelete(existingLike._id);
        
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { liked: false },
                    "Video unliked successfully"
                )
            );
    } else {
        // Like
        const newLike = await Like.create({
            video: videoId,
            likedBy
        });
        
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { liked: true, like: newLike },
                    "Video liked successfully"
                )
            );
    }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    if(!isValidObjectId(commentId)) {
        throw new ApiError(400, "invalid commentId");
    }
    
    // Check if comment exists
    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }
    
    // Check if like already exists
    const likedBy = req.user._id;
    const existingLike = await Like.findOne({
        comment: commentId,
        likedBy
    });
    
    // Toggle like (delete if exists, create if doesn't)
    if (existingLike) {
        // Unlike
        await Like.findByIdAndDelete(existingLike._id);
        
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { liked: false },
                    "Comment unliked successfully"
                )
            );
    } else {
        // Like
        const newLike = await Like.create({
            comment: commentId,
            likedBy
        });
        
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { liked: true, like: newLike },
                    "Comment liked successfully"
                )
            );
    }
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    if(!isValidObjectId(tweetId)) {
        throw new ApiError(400, "invalid tweetId");
    }
    
    // Check if tweet exists
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }
    
    // Check if like already exists
    const likedBy = req.user._id;
    const existingLike = await Like.findOne({
        tweet: tweetId,
        likedBy
    });
    
    // Toggle like (delete if exists, create if doesn't)
    if (existingLike) {
        // Unlike
        await Like.findByIdAndDelete(existingLike._id);
        
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { liked: false },
                    "Tweet unliked successfully"
                )
            );
    } else {
        // Like
        const newLike = await Like.create({
            tweet: tweetId,
            likedBy
        });
        
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { liked: true, like: newLike },
                    "Tweet liked successfully"
                )
            );
    }
})

const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    
    // Get all video likes by the current user with video details
    const likes = await Like.find({
        likedBy: userId,
        video: { $exists: true }  // Only get likes that have a video field
    })
    .populate({
        path: "video",
        select: "title description thumbnail videoFile duration views createdAt",
    })
    .sort({ createdAt: -1 });  // Sort by most recently liked
    
    // Extract just the video objects and count
    const likedVideos = likes.map(like => like.video).filter(Boolean);
    
    const user = await User
    .findById(userId)
    .select("-password -refreshToken -email -coverImage -watchHistory");
    
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    owner: user,
                    likes: likes.length,
                    videos: likedVideos
                },
                "Liked videos fetched successfully"
            )
        );
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}