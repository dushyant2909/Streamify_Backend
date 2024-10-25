import { v2 as cloudinary } from 'cloudinary'
import ApiError from './ApiError.js'

const deleteFileFromCloudinary = async (publicId, file = "image") => {
    try {
        await cloudinary.uploader.destroy(publicId,
            { resource_type: file }
        )
    } catch (error) {
        console.log("Error in deleting file form cloudinary::", error.message || error)
        throw new ApiError(401, error.message)
    }
}

export default deleteFileFromCloudinary