import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js";

const verifyJWT = asyncHandler( async (req, _, next) => {
    const token = req.cookies?.accessToken  || 
            req.header("Authorization").replace("Bearer ", "");
    
    if(!token) {
        throw new ApiError(401, "Unauthorized Request");
    }
    
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
    const userId = decodedToken?._id; // 'decoded' token is payload, hence named decoded
    const user = await User.findById(userId).select("-password -refreshToken");
    
    if(!user) {
        throw new ApiError(401, "Invalid Access Token");
    }
    
    req.user = user; // adding a user object in req
    
    next();
})

export { verifyJWT }