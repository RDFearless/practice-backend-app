import mongoose, {isValidObjectId} from "mongoose"
import { Video } from "../models/video.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadToCloudinary} from "../utils/cloudinary.js"

function toObjectId(id) {
    return new mongoose.Types.ObjectId(String(id));
}

const getAllVideos = asyncHandler(async (req, res) => {
    const { 
        page = 1, 
        limit = 10, 
        query, // TODO: find out the purpose of 'query' 
        sortBy = "createdAt", 
        sortType = -1, 
        userId } = req.query 
    
    if(!userId) {
        throw new ApiError(400, "userId missing");
    }
    if(!isValidObjectId(userId)) {
        throw new ApiError(400, "userId is not a valid ObjectId");
    }
    
    const videoAggregate = Video.aggregate([
        {
            $match: {
                owner: toObjectId(userId)
            }
        }
    ]);
    
    // configure sort options
    const sortOrder = parseInt(sortType) === 1 ? 1 : -1;
    const sortOptions = { [sortBy]: sortOrder };
    
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    
    const options = {
        sort: sortOptions,
        page: parsedPage,
        limit: parsedLimit
    }
    
    const allVideos = await Video.aggregatePaginate(videoAggregate, options);
    
    return res
    .status(200)
    .json(
        new ApiResponse(200, allVideos, "All videos fetched")
    );
});

const publishAVideo = asyncHandler(async (req, res) => {
    // get video
    const { title, description} = req.body
    const localVideoFile = req.files?.videoFile[0]?.path;
    const localThumbnailFile = req.files?.thumbnail[0]?.path;
    const owner = req.user;
    
    // validation
    if(!localVideoFile || !localThumbnailFile) {
        throw new ApiError(400, "videoFile and thumbnail can't be empty");
    }
    if(!title?.trim() || !description?.trim()) {
        throw new ApiError(400, "title and description can't be empty");
    }
    
    // upload to cloudinary
    const videoFile = await uploadToCloudinary(localVideoFile);
    const thumbnail = await uploadToCloudinary(localThumbnailFile);
    
    if(!videoFile || !thumbnail) {
        throw new ApiError(503, "Failed to upload files on cloud.");
    }
    
    // create video
    const video = await Video.create({
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        owner: owner._id,
        title: title.trim(),
        description: description.trim(),
        duration: videoFile.duration
    });
    
    res
    .status(201)
    .json(
        new ApiResponse(201, video, "New Video created")
    );
})

const getVideoById = asyncHandler(async (req, res) => {
    // get id from url
    const { videoId } = req.params
    if(!videoId) {
        throw new ApiError(400, "videoId missing");
    }
    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "videoId is not a valid ObjectId");
    }
    
    // every time this endpoint hits, view count increases
    const video = await Video.findByIdAndUpdate(
        videoId,
        { $inc: { views: 1 } },
        { new: true }
    ).populate("owner", "username avatar");
    if(!video) {
        throw new ApiError(404, "Video not found");
    }
    
    return res
    .status(200)
    .json(
        new ApiResponse(200, video, "Video fetched")
    );
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if(!videoId) {
        throw new ApiError(400, "videoId missing");
    }
    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "videoId is not a valid ObjectId");
    }
    
    const video = await Video.findById(videoId);
    if(!video) {
        throw new ApiError(404, "Video not found");
    }
    
    // Old details already stored in DB
    let _title = video.title;
    let _description = video.description;
    let _thumbnail = video.thumbnail;
    
    // getting new details from user
    const { title, description } = req.body;
    const thumbnailLocalPath = req.file?.path;
    
    // if recieved, update old with new
    if(thumbnailLocalPath) {
        const thumbnailResponse = await uploadToCloudinary(thumbnailLocalPath);
        _thumbnail = thumbnailResponse.url;
    } 
    if(title) _title = title;
    if(description) _description = description;
    
    // update in DB
    video.title = _title;
    video.description = _description;
    video.thumbnail = _thumbnail;
    
    await video.save({ validateBeforeSave: true });
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200, 
            {
                title: video.title, 
                description: video.description,
                thumbnail: video.thumbnail
            },
            "Video details updated successfully")
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!videoId) {
        throw new ApiError(400, "videoId missing");
    }
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }
    
    const deleteResponse = await Video.deleteOne({ _id: videoId });
    
    if (deleteResponse.deletedCount === 0) {
        throw new ApiError(404, "Video not found");
    }
    
    return res
    .status(200)
    .json(
        new ApiResponse(200, { deleted: true }, "Video deleted successfully")
    );
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!videoId) {
        throw new ApiError(400, "videoId missing");
    }
    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "videoId is not a valid ObjectId");
    }
    
    const video = await Video.findByIdAndUpdate(
        videoId,
        [{
            $set: {
                isPublished: {
                    $cond: { if: "$isPublished", then: false, else: true }
                }
            }
        }],
        { new: true }
    );
    if(!video) {
        throw new ApiError(404, "Video not found");
    }
    
    return res
    .status(200)
    .json (
        new ApiResponse(200, { isPublished: video.isPublished }, "toggled status successfully")
    );
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}