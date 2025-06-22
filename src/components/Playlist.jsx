import React, {useState} from "react";
import styles from "../styles/modules/Playlist.module.css";
import Track from "./Track";

function Playlist({tracks, togglePlaylist}) {
	const [playlistName, setPlaylistName] = useState("");

	const tracksInPlaylist = tracks.filter((track) => track.isInPlaylist);
	const hasTracksInPlaylist = tracksInPlaylist.length > 0;

	return (
		<div>
			<form className={styles.playlist}>
				<input
					type="text"
					onChange={(e) => setPlaylistName(e.target.value)}
					value={playlistName}
					placeholder="Enter Playlist Name"
				/>

				{hasTracksInPlaylist ? (
					<>
						{tracksInPlaylist.map((track) => (
							<Track
								key={track.id}
								id={track.id}
								title={track.title}
								artist={track.artist}
								album={track.album}
								isInPlaylist={track.isInPlaylist}
								togglePlaylist={togglePlaylist}
							/>
						))}
						<button>Save to Spotify</button>
					</>
				) : (
					<p>No tracks in the playlist</p>
				)}
			</form>
		</div>
	);
}

export default Playlist;
