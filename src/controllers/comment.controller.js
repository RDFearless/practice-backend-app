import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

function toObjectId(id) {
    return new mongoose.Types.ObjectId(String(id));
}

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query
    
    if(!videoId) {
        throw new ApiError(400, "videoId missing");
    }
    if(!mongoose.isValidObjectId(String(videoId))) {
        throw new ApiError(400, "invalid videoId");
    }
    
    const commentAggregate = Comment.aggregate([
        {
            $match: {
                video: toObjectId(videoId)
            }
        }
    ]);
    if(!commentAggregate) {
        throw new ApiError(404, "Video not found");
    }
    
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    
    const customLabels = {
        totalDocs: "totalComments",
        docs: "comments"
    }
    
    const options = {
        page: parsedPage,
        limit: parsedLimit,
        customLabels: customLabels
    }
    
    const videoComments = await Comment.aggregatePaginate(commentAggregate, options);
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            videoComments,
            "Fetched all video comments"
        )
    );
})

const addComment = asyncHandler(async (req, res) => {
    // get data
    const { videoId } = req.params;
    
    // validations
    if(!videoId) {
        throw new ApiError(400, "videoId missing");
    }
    if(!mongoose.isValidObjectId(String(videoId))) {
        throw new ApiError(400, "invalid videoId");
    }
    
    const { content } = req.body;
    if(!content) {
        throw new ApiError(400, "comment content empty");
    }
    
    const userId = req.user._id;
    // add comment to a video
    const comment = await Comment.create({
        content: content,
        video: videoId,
        owner: userId
    });
    
    return res
    .status(201)
    .json(
        new ApiResponse(
            201,
            comment,
            "Comment created and added to a video"
        )
    );
});

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    if(!commentId) {
        throw new ApiError(400, "commentId missing");
    }
    if(!mongoose.isValidObjectId(String(commentId))) {
        throw new ApiError(400, "invalid commentId");
    }
    
    const { content } = req.body;
    if(!content) {
        throw new ApiError(400, "comment content empty");
    }
    
    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: { content: content }
        }, { new: true }
    );
    if(!updatedComment) {
        throw new ApiError(404, "Comment not found");
    }
    
    return res
    .status(200)
    .json(
        new ApiResponse(200, updatedComment, "Comment updated")
    );
});

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    if(!commentId) {
        throw new ApiError(400, "commentId missing");
    }
    if(!mongoose.isValidObjectId(String(commentId))) {
        throw new ApiError(400, "invalid commentId");
    }
    
    const deleteResponse = await Comment.deleteOne({_id: commentId});
    if(deleteResponse.deletedCount === 0) {
        throw new ApiError(404, "comment not found");
    }
    
    return res
    .status(200)
    .json(
        new ApiResponse(200, { isDeleted: true }, "Comment deleted")
    );
});

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
}