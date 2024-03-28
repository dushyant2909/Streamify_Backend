import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    getPlaylistById,
    getUserPlaylists,
} from "../controllers/playlist.controller.js";

const playlistRouter = Router();

playlistRouter.use(verifyJWT, upload.none()); // Apply verifyJWT middleware to all routes in this file

playlistRouter.route("/")
    .post(createPlaylist)
    .get(getUserPlaylists);

playlistRouter
    .route("/:playlistId")
    .get(getPlaylistById)
    .patch(updatePlaylist)
    .delete(deletePlaylist);

playlistRouter.route("/add/:videoId/:playlistId").patch(addVideoToPlaylist);
playlistRouter.route("/remove/:videoId/:playlistId").patch(removeVideoFromPlaylist);

// playlistRouter.route("/user/:userId").get(getUserPlaylists);

export default playlistRouter;