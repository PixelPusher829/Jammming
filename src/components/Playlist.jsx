import { useEffect, useState } from "react";
import styles from "../styles/modules/Playlist.module.css";
import Track from "./Track";

function Playlist({
	tracks,
	setTracks,
	togglePlaylist,
	userAccessToken,
	userProfileId,
	spotifyLogin,
	makeAuthenticatedRequest,
}) {
	const [playlistInfo, setPlaylistInfo] = useState({
		name: "",
		id: "",
	});

	useEffect(() => {
		const storedPlaylistInfo = window.localStorage.getItem("playlistInfo");
		const storedTracks = window.localStorage.getItem("tracks");

		if (storedPlaylistInfo) {
			setPlaylistInfo(JSON.parse(storedPlaylistInfo));
		}
		if (storedTracks) {
			setTracks(JSON.parse(storedTracks));
		}
		window.localStorage.removeItem("playlistInfo");
		window.localStorage.removeItem("tracks");
	}, []);

	const tracksInPlaylist = tracks.filter((track) => track.isInPlaylist);
	const hasTracksInPlaylist = tracksInPlaylist && tracksInPlaylist.length > 0;

	async function getUserPlaylists() {
		const url = `users/${userProfileId}/playlists`;
		return makeAuthenticatedRequest(url, "GET", null).then(
			(response) => response.items
		);
	}

	async function updateSpotifyPlaylist(playlistId) {
		const url = `playlists/${playlistId}/tracks`;
		const body = {
			uris: tracksInPlaylist.map((track) => track.uri),
		};
		return makeAuthenticatedRequest(url, "PUT", body);
	}

	async function createNewPlaylist() {
		const url = `users/${userProfileId}/playlists`;
		const body = {
			name: playlistInfo.name,
			description: "Created with Jammming",
			public: false,
		};
		return makeAuthenticatedRequest(url, "POST", body);
	}

	async function updatePlaylistName(playlistId) {
		const url = `playlists/${playlistId}`;
		const body = {
			name: playlistInfo.name,
		};
		return makeAuthenticatedRequest(url, "PUT", body);
	}

	async function handleSaveToSpotify(e) {
		e.preventDefault();

		if (!userAccessToken) {
			window.localStorage.setItem(
				"playlistInfo",
				JSON.stringify(playlistInfo)
			);
			window.localStorage.setItem("tracks", JSON.stringify(tracks));
			spotifyLogin();
		}

		try {
			const userPlaylists = await getUserPlaylists(); //Get User Playlists

			const existingPlaylist = userPlaylists.find(
				(playlists) => playlists.id === playlistInfo.id //Search for existing playlist
			);

			if (!existingPlaylist) {
				//If playlist doesn't exist...
				const newPlaylist = await createNewPlaylist(); // ...create new playlist and save ID,
				setPlaylistInfo((prev) => ({
					...prev,
					id: newPlaylist.id,
				}));

				setPlaylistInfo((prev) => ({ ...prev, id: playlistInfo.id }));
				await updateSpotifyPlaylist(playlistInfo.id); //... then update playlist songs.
			}
			if (existingPlaylist) {
				//If playlist exists, update playlist
				await updateSpotifyPlaylist(playlistInfo.id);
			}

			if (playlistInfo.name !== existingPlaylist.name) {
				//If playlist name has changed, update playlist name
				await updatePlaylistName(playlistInfo.id);
			}
		} catch (error) {
			console.error(error);
		}
	}

	return (
		<div>
			<form className={styles.playlist} onSubmit={handleSaveToSpotify}>
				<input
					type="text"
					onChange={(e) =>
						setPlaylistInfo({
							...playlistInfo,
							name: e.target.value,
						})
					}
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
