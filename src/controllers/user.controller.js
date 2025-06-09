import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { uploadToCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { User } from "../models/user.model.js"

const registerUser = asyncHandler( async (req, res) => {
    // 1. get all user info
    const {fullName, email, username, password} = req.body
    
    // 2. validation
    if(
        [fullName, email, username, password].some((field) => field?.trim === "")
    ) {
        throw new ApiError(400, "All fields are required");
    }
    
    // 3. user already exists - username, email
    const existedUser = User.findOne({
        $or: [{ email }, { username }]
    })
    
    if(existedUser) {
        throw new ApiError(409, "user with email or username already exists")
    }
    
    // 4. avatar and coverImage check
    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path
    
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
        email,
        fullName,
        avatar: avatarUpload.url,
        coverImage: coverImageUpload?.url || "",
        password
    })
    
    // 7. check user creation, rmv pass and refreshToken from res
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken" // un-selecting pass and rfrshTkn from response
    )
    
    if(!createdUser) {
        throw new ApiError(500, "something went wrong while registering user to DB");
    }
    
    // 8. return response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully")
    );
})


export { registerUser }