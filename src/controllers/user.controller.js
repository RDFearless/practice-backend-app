import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { uploadToCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { User } from "../models/user.model.js"

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});
        
        return {accessToken, refreshToken};
    } catch (error) {
        throw new ApiError(500, `Something went wrong while generating access and refresh token: ${error}`)
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
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {refreshToken: undefined}
        },
        {
            new: true
        }
    );
    
    const options = {
        httpOnly: true,
        secure: true
    };
    
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"));
})

export { 
    registerUser, 
    loginUser,
    logoutUser
}