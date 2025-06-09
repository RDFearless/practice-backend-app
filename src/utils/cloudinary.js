import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Uploading the file provided by user to cloud
const uploadToCloudinary = async (localFilePath) => {
    if(!localFilePath) return null;
    
    try {    
        // Upload file to cloud
        const uploadResult = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        // Uploaded succesfully
        return uploadResult;
        
    } 
    
    catch (error) {
        console.error("Cloudinary upload failed: ", error);
        return null;   
    } 
    
    finally {
        // unlinking temporarily stored file
        fs.unlinkSync(localFilePath, (err) => {
            if (err) console.error("Failed to delete local file:", err);
        });
    }
}

export {uploadToCloudinary}