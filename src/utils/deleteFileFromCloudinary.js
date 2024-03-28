import cloudinary from 'cloudinary';
import ApiError from "./ApiError.js";
import { extractPublicId } from "cloudinary-build-url"

const deleteFileFromCloudinary = async (imageUrl, resourse_type = "image") => {
    try {
        // Extract public ID from imageUrl
        const publicId = extractPublicId(imageUrl)
        console.log("Public id::", publicId);

        console.log(resourse_type, " ", `${resourse_type}`);

        // Delete the image from Cloudinary using the public ID
        const result = await cloudinary.uploader.destroy(publicId, {
            resourse_type: `${ resourse_type }`
        });
        console.log(result);
        return result;

    } catch (error) {
        console.log("Error in deleteFileFromCloudinary util::", error.message);
        throw new ApiError(401, error.message);
    }
}

export default deleteFileFromCloudinary;
