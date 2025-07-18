import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { uploadToCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { User } from "../models/user.model.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
                
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});
        
        return {accessToken, refreshToken};
    } catch (error) {
        throw new ApiError(500, `Failed to generate tokens: ${error.message}`)
    }
}

const registerUser = asyncHandler( async (req, res) => {
    // 1. get all user info
    const {fullname, email, username, password} = req.body
    
    // 2. validation
    if(
        [fullname, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required");
    }
    
    // 3. user already exists - username, email
    const existedUser = await User.findOne({
        $or: [{ email }, { username }]
    })
    
    if(existedUser) {
        throw new ApiError(409, "user with email or username already exists")
    }
    
    // 4. avatar and coverImage check
    const avatarLocalPath = req.files?.avatar[0]?.path
    
    // cover image is not a required feild
    let coverImageLocalPath;
    if(
        req.files && 
        Array.isArray(req.files.coverImage) && 
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    
    if(!avatarLocalPath) { // avatar is a required field
        throw new ApiError(400, "Avatar file is required");
    }
    
    // 5. upload files to cloudinary
    const avatarUpload = await uploadToCloudinary(avatarLocalPath);
    const coverImageUpload = await uploadToCloudinary(coverImageLocalPath);
    
    if(!avatarUpload) {
        throw new ApiError(503, "Failed to upload avatar to cloud storage. Please try again.")
    }
    
    // 6. user entry to DB
    const user = await User.create({
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        fullname,
        avatar: avatarUpload.url,
        coverImage: coverImageUpload?.url || "",
        password
    })
    
    // 7. check user creation, rmv pass and refreshToken from res(frontend)
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken" // un-selecting pass and rfrshTkn from response
    )
    
    if(!createdUser) {
        throw new ApiError(500, "something went wrong while registering user to DB");
    }
    
    // 8. return response(frontend)
    return res.status(201).json(
        new ApiResponse(201, createdUser, "User Registered Successfully")
    );
})

const loginUser = asyncHandler( async (req, res) => {
    // 1. req body -> get all data
    const {username, email, password} = req.body;
    
    // 2. check username or email
    if(!username && !email) {
        throw new ApiError(400, "Username or Email is empty");
    }
    
    // 3. find the user
    const user = await User.findOne({
        $or: [{ username }, { email }]
    });
    if(!user) {
        throw new ApiError(401, "Invalid user credentials");
    }
    
    // 4. password validation
    if(!password) {
        throw new ApiError(400, "Password is empty")
    }
    const isPasswordValid = await user.isPasswordCorrect(password);
    if(!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }
    
    // 5. generate access and refresh tokens
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);
    
    // 6. return response - loggedUser body, cookies
    const loggedUser = await User.findById(user._id).select("-password -refreshToken");
    
    const options = {
        httpOnly: true,
        secure: true
    }
    
    return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse( 
            201, 
            {
                data: loggedUser, 
                accessToken, 
                refreshToken
            }, 
            "user logged in successfully"
        )
    );
})

const logoutUser = asyncHandler( async (req, res) => {
    try {
        // Remove refreshToken from DB
        await User.findByIdAndUpdate(
            req.user._id,
            { $unset: { refreshToken: 1 } },
            { new: true }
        );
        
        // Cookie-clearing options
        const options = {
            httpOnly: true,
            secure: true
        };
        
        // Clear cookies and send response
        return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User Logged Out"));
    } catch (error) {
        console.error("Logout error:", error);
        throw new ApiError(500, "Failed to logout due to server error");
    }
});

const accessRefreshToken = asyncHandler( async (req, res) => {
    // this method is called because access token is not available(expired)
    
    // 1. get refresh token from request
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if(!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized Request");
    }
    
    // 2. verify and decode the refresh token to get user information
    const decodedToken = jwt.verify(
        incomingRefreshToken, 
        process.env.REFRESH_TOKEN_SECRET
    );
    
    try {
        // 3. validate user with incoming refresh token
        const user = await User.findById(decodedToken?._id);
        if(!user) {
            throw new ApiError(401, "Invalid Refresh Token");
        }
        
        if(incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh Token is expired or used");
        }
        
        // 4. generate new access and refresh tokens
        const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id); // this method also saves the refresh token to DB
        
        const options = {
            httpOnly: true,
            secure: true
        };
        
        // 5. return response
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, {}, "New Tokens Generated Succesfully"));
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token");
    }
});

const changeCurrentPassword = asyncHandler( async (req, res) => {
    const {username, oldPassword, newPassword} = req.body;
    if(!username) {
        throw new ApiError(400, "Username can't be empty");
    }
    if(!oldPassword && !newPassword) {
        throw new ApiError(400, "old and new password are required");
    }
    
    const user = await User.findById(req.user._id);
    
    if(!(user.username === username)) {
        throw new ApiError(400, "Invalid Credentials");
    }
    
    const isPasswordValid = await user.isPasswordCorrect(oldPassword);
    if(!isPasswordValid) {
        throw new ApiError(400, "Invalid Password");
    }
    
    user.password = newPassword;
    await user.save();
    
    const options = {
        httpOnly: true,
        secure: true
    }
    
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "Password Changed")
    );
});

const getCurrentUser = asyncHandler( async (req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched"));
});

const updateUserAvatar = asyncHandler( async (req, res) => {
    const avatarLocalPath = req.file?.path;
    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar file missing");
    }
    
    const avatar = await uploadToCloudinary(avatarLocalPath);
    if(!avatar) {
        throw new ApiError(500, "Something went wrong while uploading Avatar file to cloudinary");
    }
    
    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { avatar: avatar.url} }, // Update Avatar in DB
        { new: true }
    );
    
    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar updated successfully")
    );
});

const updateUserCoverImage = asyncHandler( async (req, res) => {
    const coverImageLocalPath = req.file?.path;
    if(!coverImageLocalPath) {
        throw new ApiError(400, "Cover Image file missing");
    }
    
    const coverImage = await uploadToCloudinary(coverImageLocalPath);
    if(!coverImage) {
        throw new ApiError(500, "Something went wrong while uploading Cover Image file to cloudinary");
    }
    
    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { coverImage: coverImage.url} }, // Update Cover Image in DB
        { new: true }
    );
    
    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover Image updated successfully")
    );
});

const getUserChannelProfile = asyncHandler( async (req, res) => {
    const { username } = req.params;
    if(!username?.trim()) {
        throw new ApiError(400, "username is missing");
    }
    
    const channelProfile = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            // to get number of 'subscribers' of my channel
            $lookup: {
                from: "subscriptions", // subscription.model
                localField: "_id",
                foreignField: "channel", 
                as: "subscribers" // subscribers[] -> all the 'users' who are subscribers
            }
        },
        {
            // to get number of 'channels' I've subscribed to
            $lookup: {
                from: "subscriptions", // subscription.model
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo" // subscribedTo[] -> all the 'users' to whom I am subscribed to
            }
        },
        {
            $addFields: { // adds new fields in user model
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedTo: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond : {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: { // optionally return required field from the new user model
                username: 1,
                email: 1,
                fullname: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                channelsSubscribedTo: 1,
                isSubscribed: 1
            }
        }
    ])
    if(!channelProfile?.length) {
        throw new ApiError(404, "Channel does not exists");
    }
    
    return res
    .status(200)
    .json(
        new ApiResponse(200, channelProfile[0], "User channel fetched")
    );
});

const getWatchHistory = asyncHandler( async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(`${req.user._id}`)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $addFields: {
                                        owner: {
                                            $first: "$owner"
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        }
    ])
        
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch History fetched"
        )
    )
})

export { 
    registerUser, 
    loginUser,
    logoutUser,
    accessRefreshToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}