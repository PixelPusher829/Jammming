import "../styles/App.css";
import { useState, useEffect, use } from "react";
import Playlist from "./Playlist";
import SearchResults from "./SearchResults";
import SearchBar from "./SearchBar";
import SignInBanner from "./SignInBanner";

const generateRandomString = (length) => {
	const possible =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	const values = crypto.getRandomValues(new Uint8Array(length));
	return values.reduce((acc, x) => acc + possible[x % possible.length], "");
};

const sha256 = async (plain) => {
	const encoder = new TextEncoder();
	const data = encoder.encode(plain);
	return window.crypto.subtle.digest("SHA-256", data);
};

const base64encode = (input) => {
	return btoa(String.fromCharCode(...new Uint8Array(input)))
		.replace(/=/g, "")
		.replace(/\+/g, "-")
		.replace(/\//g, "_");
};

function App() {
	const clientId = import.meta.env.VITE_APP_SPOTIFY_CLIENT_ID;
	const clientSecret = import.meta.env.VITE_APP_SPOTIFY_CLIENT_SECRET;

	const [publicAccessToken, setPublicAccessToken] = useState(null);
	const [userAccessToken, setUserAccessToken] = useState(null);
	const [userProfileId, setUserProfileId] = useState(null);
	const [tracks, setTracks] = useState([]);

	useEffect(() => {
		getPublicAccessToken();
		if (!userAccessToken) {
			getRefreshToken(); 
			setUserAccessToken(window.localStorage.getItem("userAccessToken"));
		}
	}, []);

	useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search);
		let code = urlParams.get("code");

		if (code) {
			window.localStorage.setItem("code", code);
		}
	}, []);

	useEffect(() => {
		const code = window.localStorage.getItem("code");
		if (code) {
			getUserAccessToken(code);
		}
	}, []);

	useEffect(() => {
		if (userAccessToken) {
			getUserProfileId();
		}
	}, [userAccessToken]);

	async function getPublicAccessToken() {
		const authString = btoa(`${clientId}:${clientSecret}`);
		const params = new URLSearchParams();
		params.append("grant_type", "client_credentials");

		const response = await fetch("https://accounts.spotify.com/api/token", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Authorization: `Basic ${authString}`,
			},
			body: params,
		});

		const data = await response.json();
		// console.log("Public Access Token:", data.access_token);
		setPublicAccessToken(data.access_token);
	}

	async function spotifyLogin() {
		// console.log("Spotify Login");
		const codeVerifier = generateRandomString(64);
		const hashed = await sha256(codeVerifier);
		const codeChallenge = base64encode(hashed);
		const redirectUri = "http://127.0.0.1:5173/";
		const scope =
			"user-read-private user-read-email playlist-modify-private playlist-modify-public";
		const authUrl = new URL("https://accounts.spotify.com/authorize");

		window.localStorage.setItem("code_verifier", codeVerifier);
		
		const params = {
			response_type: "code",
			client_id: clientId,
			scope,
			code_challenge_method: "S256",
			code_challenge: codeChallenge,
			redirect_uri: redirectUri,
		};

		authUrl.search = new URLSearchParams(params).toString();
		window.location.href = authUrl.toString();
	}

	async function getUserAccessToken(code) {
		// console.log("getUserAccessToken");
		const codeVerifier = window.localStorage.getItem("code_verifier");
		const url = "https://accounts.spotify.com/api/token";
		const redirectUri = "http://127.0.0.1:5173/";
		try {
			const payload = {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					client_id: clientId,
					grant_type: "authorization_code",
					code,
					redirect_uri: redirectUri,
					code_verifier: codeVerifier,
				}),
			};

			const body = await fetch(url, payload);
			const response = await body.json();

			// console.log("User Access Token:", response.access_token);
			setUserAccessToken(response.access_token);
			localStorage.setItem("access_token", response.access_token);

		} catch (error) {
			console.error("Error getting user access token:", error);
			console.error("Response body:", error.response.json());
		}
	}

	const getRefreshToken = async () => {
		// refresh token that has been previously stored
		const refreshToken = localStorage.getItem("refresh_token");
		const url = "https://accounts.spotify.com/api/token";

		const payload = {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				grant_type: "refresh_token",
				refresh_token: refreshToken,
				client_id: clientId,
			}),
		};
		const body = await fetch(url, payload);
		const response = await body.json();

		localStorage.setItem("access_token", response.access_token);
		if (response.refresh_token) {
			localStorage.setItem("refresh_token", response.refresh_token);
		}
	};

	async function getUserProfileId() {
		console.log("getUserProfileId");
		const url = "https://api.spotify.com/v1/me";
		try {
			const response = await fetch(url, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${userAccessToken}`,
				},
			});
			const data = await response.json();
			console.log("Fetched user profile:", data.id);
			setUserProfileId(data.id);
		} catch (error) {
			console.error("Error fetching user ID:", error.message);
		}
	}

	async function searchSpotify(searchTerm) {
		const endpoint = "https://api.spotify.com/v1/search";
		const type = "track";
		const limit = 10;
		const params = new URLSearchParams();
		params.append("q", searchTerm);
		params.append("type", type);
		params.append("limit", limit);
		const url = `${endpoint}?${params.toString()}`;
		try {
			const response = await fetch(url, {
				headers: {
					Authorization: `Bearer ${
						userAccessToken || publicAccessToken
					}`,
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
				const tracks = data.tracks.items.map((track) => ({
					...track,
					isInPlaylist: false,
				}));
				return tracks;
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
		setTracks((prev) => [...prev.filter((track) => track.isInPlaylist), ...trackData]);
	}

	function togglePlaylist(id) {
		const updatedTracks = tracks.map((track) => {
			if (track.id === id) {
				return { ...track, isInPlaylist: !track.isInPlaylist };
			}
			return track;
		});
		setTracks(updatedTracks);
	}

	return (
		<>
			<header>
				<h1>
					Ja<span>mmm</span>ing
				</h1>
			</header>
			{!userAccessToken && <SignInBanner spotifyLogin={spotifyLogin} />}
			<main>
				<SearchBar handleSearch={handleSearch} />
				<div className="contents">
					<SearchResults
						togglePlaylist={togglePlaylist}
						tracks={tracks}
					/>
					<Playlist
						togglePlaylist={togglePlaylist}
						tracks={tracks}
						userAccessToken={userAccessToken}
						userProfileId={userProfileId}
						spotifyLogin={spotifyLogin}
					/>
				</div>
			</main>
		</>
	);
}

//Dont forget to remove SSL certificate, uninstall Open SSL and reset vite.config when deploying!!

export default App;
