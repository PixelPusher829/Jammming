import "../styles/App.css";
import { useState, useEffect } from "react";
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
		if (!publicAccessToken) {
			getPublicAccessToken();
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
		if (!userProfileId && userAccessToken) {
			getUserProfileId();
		}
	}, [userAccessToken]);

	async function makeAuthenticatedRequest(endpoint, method, data) {
		const headers = {
			"Content-Type": "application/json",
		};
		if (userAccessToken) {
			headers["Authorization"] = `Bearer ${userAccessToken}`;
		} else if (publicAccessToken) {
			headers["Authorization"] = `Bearer ${publicAccessToken}`;
		} else {
			console.log("No authorization token being used for request.");
		}
		try {
			const response = await fetch(`https://api.spotify.com/v1/${endpoint}`, {
				method: method,
				headers: headers,
				body: data ? JSON.stringify(data) : undefined,
			});
			if (response.status === 401 || response.status === 403) {
				if (userAccessToken) {
					window.localStorage.removeItem("access_token");
					setUserAccessToken(null);
					console.warn(
						"Client token expired or unauthorized. Cleared."
					);
					getRefreshToken();
				} else if (publicAccessToken) {
					console.warn(
						"Public key token failed. Clearing public token."
					);
					setPublicAccessToken(null);
					getPublicAccessToken();
				}
				throw new Error(
					"Authentication/Authorization failed for request."
				);
			}
			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`HTTP error! status: ${response.status} - ${errorText}`
				);
			}
			return response.json();
		} catch (error) {
			console.error(`request to ${url} failed`, error);
			throw error;
		}
	}

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
		console.log('Public access token:', data.access_token);
		setPublicAccessToken(data.access_token);
	}

	async function getUserAccessToken(code) {
		console.log("Getting user access token, code:" + code);
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
			if (response.access_token) {
				console.log("User access token:", response.access_token);
				setUserAccessToken(response.access_token);
				window.localStorage.setItem(
					"access_token",
					response.access_token
				);
			}
		} catch (error) {
			console.error("Error getting user access token:", error);
			console.error("Response body:", error.response.json());
		}
	}

	async function spotifyLogin() {
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

	async function getRefreshToken() {
		try {
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
			const data = await fetch(url, payload);
			const response = await data.json();

			if (response.error) {
				console.error("Error refreshing token:", response.error);
			} else {
				setUserAccessToken(response.access_token);
				window.localStorage.setItem(
					"access_token",
					response.access_token
				);
				if (response.refresh_token) {
					localStorage.setItem(
						"refresh_token",
						response.refresh_token
					);
				}
			}
		} catch (error) {
			console.error("Error refreshing token:", error);
		}
	}

	async function getUserProfileId() {
		console.log("getUserProfileId: userAccessToken:", userAccessToken);
		const url = "me";
		return makeAuthenticatedRequest(url, "GET", null).then((response) => {
			console.log("User Profile ID:", response.id);
			setUserProfileId(response.id);
		});
	}

	async function searchSpotify(searchTerm) {
		const endpoint = "search";
		const type = "track";
		const limit = 10;
		const params = new URLSearchParams();
		params.append("q", searchTerm);
		params.append("type", type);
		params.append("limit", limit);
		const url = `${endpoint}?${params.toString()}`;
		return makeAuthenticatedRequest(url, "GET", null).then((response) => {
			if (response.tracks && response.tracks.items) {
				const tracks = response.tracks.items.map((track) => ({
					...track,
					isInPlaylist: false,
				}));
				return tracks;
			} else {
				console.log("No tracks found.");
				return [];
			}
		});
	}

	async function handleSearch(searchTerm) {
		const trackData = await searchSpotify(searchTerm);
		setTracks((prev) => [
			...prev.filter((track) => track.isInPlaylist),
			...trackData,
		]);
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
			{!userAccessToken ? (
				<SignInBanner spotifyLogin={spotifyLogin} />
			) : null}
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
						setTracks={setTracks}
						userAccessToken={userAccessToken}
						userProfileId={userProfileId}
						spotifyLogin={spotifyLogin}
						makeAuthenticatedRequest={makeAuthenticatedRequest}
					/>
				</div>
			</main>
		</>
	);
}

//Dont forget to remove SSL certificate, uninstall Open SSL and reset vite.config when deploying!!

export default App;
