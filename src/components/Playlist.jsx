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
	const [isActiveEffect, setIsActiveEffect] = useState(false);
	const [fadeKey, setFadeKey] = useState(0);
	
	const [playlistButtonText, setPlaylistButtonText] = useState("Login to Spotify");
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
	});

	useEffect(() => {
		if (userAccessToken && !playlistInfo.id) {
			setPlaylistButtonText("Save to Spotify");
		} else if(playlistInfo.id) {
			setPlaylistButtonText("Update Playlist");
		} else if (!userAccessToken) {
			setPlaylistButtonText("Login to Spotify");
		}
	}, [userAccessToken, playlistInfo.id]);

	const tracksInPlaylist = tracks.filter((track) => track.isInPlaylist);
	const hasTracksInPlaylist = tracksInPlaylist && tracksInPlaylist.length > 0;

	async function getPlaylist(id) {
		if (!id) return;
		const url = `playlists/${id}`;
		return await makeAuthenticatedRequest(url, "GET", null);
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

	function handleButtonEffect() {
		if (isActiveEffect) {
			return;
		}
		setIsActiveEffect(true);

		setTimeout(() => {
			setIsActiveEffect(false);
		}, 500);
	}

	function triggerFadeOut(){
		setFadeKey((prevKey) => prevKey + 1); 
	};

	async function handleSaveToSpotify(e) {
		e.preventDefault();

		if (!userAccessToken) {
			window.localStorage.setItem(
				"playlistInfo",
				JSON.stringify(playlistInfo)
			);
			window.localStorage.setItem("tracks", JSON.stringify(tracks));
			await spotifyLogin();
			return;
		}

		try {
			const response = await getPlaylist(playlistInfo.id);
			const existingPlaylist = response ? true : false;

			if (!existingPlaylist) {
				console.log("Playlist doesnt exist, creating...");
				const newPlaylist = await createNewPlaylist();
				setPlaylistInfo((prev) => ({ ...prev, id: newPlaylist.id }));
				const response = await updateSpotifyPlaylist(newPlaylist.id);
				if (response) {
					triggerFadeOut();
				}
			} else {
				console.log("Playlist already exists, updating...");
				const response = await updateSpotifyPlaylist(playlistInfo.id);
				await updatePlaylistName(playlistInfo.id);
				if (response) {
					triggerFadeOut();
				}
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
						<button
							onClick={handleButtonEffect}
							className={`${styles.saveButton} ${
								isActiveEffect ? styles.buttonEffect : ""
							}`}
						>
							{playlistButtonText}
						</button>
						{playlistInfo.id && (
							<p
								key={fadeKey} 
								className={`${styles.success} ${styles.fadeOut}`} 
							>
								Playlist saved!
							</p>
						)}
					</>
				) : (
					<p>No tracks in the playlist</p>
				)}
			</form>
		</div>
	);
}

export default Playlist;
