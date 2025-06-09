import mongoose, {Schema} from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: [true, "Username is required"],
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true
        },
        
        fullname: {
            type: String,
            required: [true, "Fullname is required"],
            trim: true,
            index: true
        },
        
        avatar: {
            type: String, // cloudinary URL 
            required: true 
        },
        
        coverImage: {
            type: String, // cloudinary URL 
        },
        
        watchHistory: [ // Array of Videos
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        
        password: {
            type: String,
            required: [true, "Password is required"]
        },
        
        refreshToken: {
            type: String
        }
        
    }, {timestamps: true}
)

// Stroring hash password
userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return next();
    
    this.password = await bcrypt.hash(this.password, 10);
    next()
});

// Comparing hash password
userSchema.methods.isPasswordCorrect = 
async function (password) {
    return await bcrypt.compare(password, this.password);
}

// Generate access token
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            username: this.username,
            email: this.email,
            fullname: this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

// Generate refresh token
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema);