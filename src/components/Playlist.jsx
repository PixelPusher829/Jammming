import styles from "../styles/modules/Playlist.module.css";
import { useState } from "react";

function Playlist() {
    const [playlistName, setPlaylistName] = useState("");

    return (
			<div>
				<h2>Playlist</h2>
				<form className={styles.playlist}>
                <input
                    type="text"
                    onChange={(e) => setPlaylistName(e.target.value)}
                    value={playlistName}
                 />
				</form>
			</div>
		);
}

export default Playlist;
