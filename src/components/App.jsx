import "../styles/App.css";
import { useState, useEffect } from "react";
import Playlist from "./Playlist";
import SearchResults from "./SearchResults";
import SearchBar from "./SearchBar";

const clientId = import.meta.env.VITE_APP_SPOTIFY_CLIENT_ID;
const clientSecret = import.meta.env.VITE_APP_SPOTIFY_CLIENT_SECRET;

function App() {
	const [accessToken, setAccessToken] = useState(null);
	const [tracks, setTracks] = useState([]);

	useEffect(() => {
		async function fetchToken() {
			const token = await getSpotifyAccessToken();
			setAccessToken(token);
		}
		fetchToken();
	}, []);

	async function getSpotifyAccessToken() {
		const url = "https://accounts.spotify.com/api/token";
		try {
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`,
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			return data.access_token;
		} catch (error) {
			console.error("Error fetching Spotify access token:", error);
			return null;
		}
	}

	async function searchSpotify(searchTerm) {
		console.log('Search function run')
		if (!accessToken) {
			console.error(
				"No Spotify access token available. Cannot perform search."
			);
			return [];
		}

		const endpoint = "https://api.spotify.com/v1/search";
		const type = "track";
		const limit = 10;
		const query = encodeURIComponent(searchTerm); 
		const url = `${endpoint}?q=${query}&type=${type}&limit=${limit}`;

		try {
			const response = await fetch(url, {
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			});

			if (!response.ok) {
				const errorText = await response.text(); 
				throw new Error(
					`HTTP error! status: ${response.status} - ${errorText}`
				);
			}

			const data = await response.json();
			if (data.tracks && data.tracks.items) {
                const tracksWithPlaylistStatus = data.tracks.items.map(
					(track) => ({
						...track,
						isInPlaylist: false,
					})
				);
				return tracksWithPlaylistStatus;
			} else {
				console.warn(
					"Spotify API response did not contain expected tracks data.",
					data
				);
				return [];
			}
		} catch (error) {
			console.error("Error searching Spotify:", error);
			return [];
		}
	}

	async function handleSearch(searchTerm) {
		const trackData = await searchSpotify(searchTerm);
		setTracks(trackData);
	}

	function togglePlaylist(id) {
		setTracks(
			tracks.map((prev) => {
				if (prev.id == id) {
					return { ...prev, isInPlaylist: !prev.isInPlaylist };
				}
				return prev;
			})
		);
	}

	return (
		<>
			<header>
				<h1>
					Ja<span>mmm</span>ing
				</h1>
			</header>
			<main>
				<SearchBar handleSearch={handleSearch} />
				<div className="contents">
					<SearchResults
						tracks={tracks}
						togglePlaylist={togglePlaylist}
					/>
					<Playlist tracks={tracks} togglePlaylist={togglePlaylist} />
				</div>
			</main>
		</>
	);
}

//Dont forget to remove SSL certificate, uninstall Open SSL and reset vite.config when deploying!!

export default App;
