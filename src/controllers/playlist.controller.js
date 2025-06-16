import {isValidObjectId} from "mongoose"
import { User } from "../models/user.model.js"
import { Video } from "../models/video.model.js"
import { Playlist } from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    const ownerId = req.user._id;
    
    // validations
    if(!name?.trim().length) {
        throw new ApiError(400, "Name can't be empty")
    }
    
    const playlistExists = await Playlist.exists({name: name, owner: ownerId});
    if(playlistExists) {
        throw new ApiError(400, `Playlist with name, '${name}' already exists on this channel`);
    }
    
    
    const playlist = await Playlist.create({
        name: name,
        description: description,
        owner: ownerId
    });
    
    return res
    .status(201)
    .json(
        new ApiResponse(
            201,
            playlist,
            "Playlist created"
        )
    );
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    
    // validations
    if(!userId) {
        throw new ApiError(400, "userId missing");
    }
    if(!isValidObjectId(userId)) {
        throw new ApiError(400, "invalid userId");
    }
    
    const userExists = await User.exists({_id: userId});
    if(!userExists) {
        throw new ApiError(404, "User/channel not found");
    }
    
    const playlists = await Playlist
    .find({ owner: userId })
    .select("-owner");
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200, 
            {
                user: userId,
                totalPlaylists: playlists.length,
                playlists: playlists
            },
            "User playlists fetched"
        )
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    
    // validations
    if(!playlistId) {
        throw new ApiError(400, "playlistId missing");
    }
    if(!isValidObjectId(playlistId)) {
        throw new ApiError(400, "invalid playlistId");
    }
    
    const playlist = await Playlist.findById(playlistId);
    if(!playlist) {
        throw new ApiError(404, "Playlist not found ");
    }
    
    return res
    .status(200)
    .json(
        new ApiResponse(200, playlist, "Playlist fetched")
    );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    
    // validations
    if (!playlistId) {
        throw new ApiError(400, "playlistId missing");
    }
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "invalid playlistId");
    }
    
    if (!videoId) {
        throw new ApiError(400, "videoId missing");
    }
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "invalid videoId");
    }
    
    const videoExists = await Video.exists({ _id: videoId });
    if(!videoExists) {
        throw new ApiError(404, "Video not found");
    }
    
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        { _id: playlistId, owner: req.user._id },
        { $push: { videos: videoId } }, 
        { new: true }
    );
    
    if(!updatedPlaylist) {
        // This could be either playlist not found or unauthorized
        const playlist = await Playlist.findById(playlistId);
        
        if(!playlist) {
            throw new ApiError(404, "Playlist not found");
        } else {
            throw new ApiError(401, "Unauthorized request");
        }
    }
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Video added to playlist"
        )
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    
    // validations
    if (!playlistId) {
        throw new ApiError(400, "playlistId missing");
    }
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "invalid playlistId");
    }
    
    if (!videoId) {
        throw new ApiError(400, "videoId missing");
    }
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "invalid videoId");
    }
    
    const videoExists = await Video.exists({ _id: videoId });
    if(!videoExists) {
        throw new ApiError(404, "Video not found");
    }
    
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        { _id: playlistId, owner: req.user._id },
        { $pull: { videos: videoId } }, 
        { new: true }
    );
    
    if(!updatedPlaylist) {
        // This could be either playlist not found or unauthorized
        const playlist = await Playlist.findById(playlistId);
        
        if(!playlist) {
            throw new ApiError(404, "Playlist not found");
        } else {
            throw new ApiError(401, "Unauthorized request");
        }
    }
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Video removed from playlist"
        )
    );
    
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    if (!playlistId) {
        throw new ApiError(400, "playlistId missing");
    }
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "invalid playlistId");
    }
    
    const playlist = await Playlist.findById(playlistId);    
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }
    
    // Verify ownership
    if (playlist.owner.toString() != req.user._id.toString()) {
        throw new ApiError(403, "Unauthorized request");
    }
    
    await Playlist.deleteOne({ _id: playlistId });
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            { isDeleted: true },
            "Playlist deleted"
        )
    );
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description, isPrivate} = req.body
    
    if (!playlistId) {
        throw new ApiError(400, "playlistId missing");
    }
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "invalid playlistId");
    }
    
    const playlist = await Playlist.findById(playlistId);
    if(!playlist) {
        throw new ApiError(404, "Playlist not found");
    }
    
    // Verify ownership
    if(playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Unauthorized request");
    }
    
    const updateData = {};    
    // updating with newer data if provided
    if(name) updateData.name = name;
    if(description) updateData.description = description;
    
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        { $set: updateData },
        { new: true }
    );
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            updatedPlaylist,
            "Playlist updated"
        )
    );
});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}