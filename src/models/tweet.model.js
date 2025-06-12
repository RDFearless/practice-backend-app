import mongoose, { Schema } from "mongoose";

const tweetSchema = new Schema(
    {
        content: {
            type: String,
            required: true,
            trim: true,
            minLength: [1, "Comment can't be empty"],
            maxLength: [3000, "Comment too long"],
        },
        
        owner: {
            type: Schema.Types, ObjectId,
            ref: "User",
            required: true
        }
    }, { timestamps: true }
)

export const Tweet = mongoose.model("Tweet", tweetSchema);