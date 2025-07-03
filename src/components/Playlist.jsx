import {useState} from "react";
import styles from "../styles/modules/Playlist.module.css";
import Track from "./Track";

function Playlist({tracks, togglePlaylist}) {
	const [playlistName, setPlaylistName] = useState("");
	const [playlist, setPlaylist] = useState([]);

	const tracksInPlaylist = tracks.filter((track) => track.isInPlaylist);
	const hasTracksInPlaylist = tracksInPlaylist.length > 0;

	function handleSaveToSpotify(e) {
		e.preventDefault();
		setPlaylist((prev) => [
			...prev,
			tracks.filter((track) => track.isInPlaylist),
			console.log(playlist, playlistName),
		]);
	}

	return (
		<div>
			<form className={styles.playlist} onSubmit={handleSaveToSpotify}>
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
								id={track.id}
								key={track.id}
								name={track.name}
								artists={track.artists}
								album={track.album}
								isInPlaylist={track.isInPlaylist}
								togglePlaylist={togglePlaylist}
							/>
						))}
						<button type="submit">Save to Spotify</button>
					</>
				) : (
					<p>No tracks in the playlist</p>
				)}
			</form>
		</div>
	);
}

export default Playlist;
