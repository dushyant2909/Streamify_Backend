import { MulterError } from 'multer';
import ApiError from '../utils/ApiError.js';

const errorHandler = (error, req, res, next) => {
    // Handle specific Multer errors
    if (error instanceof MulterError) {
        switch (error.code) {
            case "LIMIT_UNEXPECTED_FILE":
                return res.status(400).json({ success: false, message: "File type is wrong" });
            case "LIMIT_FILE_COUNT":
                return res.status(400).json({ success: false, message: "File count exceeded" });
            case "LIMIT_FILE_SIZE":
                return res.status(400).json({ success: false, message: "File size exceeded" });
            default:
                return res.status(400).json({ success: false, message: "Multer error occurred" });
        }
    }

    // Handle ApiError instances
    if (error instanceof ApiError) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message,
            errors: error.errors || [],
            data: null,
        });
    }

    // Handle other errors
    return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
        errors: error || [],
        data: null,
    });
};

export default errorHandler;
