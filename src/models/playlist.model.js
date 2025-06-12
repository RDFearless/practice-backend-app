import mongoose, { Schema } from "mongoose";

const playlistSchema = new Schema(
    {
        name: {
            type: String,
            required: [true, "Playlist needs a name"],
            trim: true,
            minlength: [1, "Playlist name cannot be empty"]
        },
        
        description: {
            type: String,
            trim: true,
            maxlength: [300, "Description too long"]
        },
        
        videos: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        
        isPrivate: {
            type: Boolean,
            default: false
        }
        
    }, { timestamps: true }
)

// Any given user cannot create 2 playlists with same name
playlistSchema.index(
    { owner: 1, name: 1 },
    { unique: true }
)


export const Playlist = mongoose.model("Playlist", playlistSchema);