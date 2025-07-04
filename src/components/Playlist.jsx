import { useState } from "react";
import styles from "../styles/modules/Playlist.module.css";
import Track from "./Track";

function Playlist({ tracks, togglePlaylist, userAccessToken, userProfileId, spotifyLogin }) {
	const [playlistInfo, setPlaylistInfo] = useState([
		{
			playlistname: "",
			playlistId: "",
		},
	]);
	const tracksInPlaylist = tracks.filter((track) => track.isInPlaylist);
	const hasTracksInPlaylist = tracksInPlaylist && tracksInPlaylist.length > 0;

	async function getExistingPlaylists() {
		const url = `https://api.spotify.com/v1/users/${userProfileId}/playlists`;
		try {
			const response = await fetch(url, {
				headers: {
					Authorization: `Bearer ${userAccessToken}`,
				},
			});
			const data = await response.json();
			return data.items;
		} catch (error) {
			console.error("Error getting existing playlists:", error);
		}
	}

	async function createSpotifyPlaylist() {
		const existingPlaylists = await getExistingPlaylists();
		const existingPlaylist = existingPlaylists.find(
			(spotifyPlaylist) => spotifyPlaylist.name === playlistInfo.name
		);

		if (existingPlaylist) {
			console.log(
				`Playlist "${playlistInfo.name}" already exists, updating instead of creating.`
			);
			setPlaylistInfo((playlist) => (playlist.id = existingPlaylist));
			await updateSpotifyPlaylist(existingPlaylist.id);
		} else {
			console.log(`Creating new playlist "${playlistInfo.name}"`);
			const response = await createNewPlaylist();
			setPlaylistInfo((playlistInfo.id = response.id));
		}
	}

	async function updateSpotifyPlaylist(playlistId) {
		const url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
		try {
			const response = await fetch(url, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${userAccessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					uris: tracks.map((track) => track.uri),
				}),
			});
			const data = await response.json();
			console.log("Playlist updated:", data);
		} catch (error) {
			console.error("Error updating playlist:", error);
		}
	}

	async function createNewPlaylist() {
		const url = `https://api.spotify.com/v1/users/${userProfileId}/playlists`;
		try {
			const response = await fetch(url, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${userAccessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name: playlistInfo.name,
					description: "Created with Jammming",
					public: false,
				}),
			});
			const data = await response.json();
			console.log("Playlist created:", data);
			return data;
		} catch (error) {
			console.error("Error creating playlist:", error);
		}
	}

	async function handleSaveToSpotify(e) {
		e.preventDefault();

		if (!userAccessToken) {
			spotifyLogin();
		}
		try {
			if (playlistInfo.id) {
				await updateSpotifyPlaylist(playlistInfo.id);
			} else {
				await createSpotifyPlaylist();
			}
			console.log("Playlist saved successfully!");
		} catch (error) {
			console.error("Error saving playlist:", error);
		}
	}

	return (
		<div>
			<form className={styles.playlist} onSubmit={handleSaveToSpotify}>
				<input
					type="text"
					onChange={(e) => setPlaylistInfo({ name: e.target.value })}
					value={playlistInfo.name}
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
