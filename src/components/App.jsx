import "../styles/App.css";
import { useState, useEffect, useCallback } from "react";
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
	const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
	const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

	const [publicAccessToken, setPublicAccessToken] = useState(null);
	const [userAccessToken, setUserAccessToken] = useState(null);
	const [userProfileId, setUserProfileId] = useState(null);
	const [tracks, setTracks] = useState([]);
	const [refreshToken, setRefreshToken] = useState(null);
	const [expiresAt, setExpiresAt] = useState(0);

	const refreshAccessToken = useCallback(async () => {
		const storedRefreshToken = localStorage.getItem(
			"spotify_refresh_token"
		);

		if (!storedRefreshToken) {
			console.log("No refresh token found to refresh.");
			setUserAccessToken(null);
			setRefreshToken(null);
			setExpiresAt(0);
			localStorage.clear();
			return null;
		}

		try {
			const response = await fetch("/api/spotify-auth", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ refreshToken: storedRefreshToken }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				console.error(
					"Error from /api/spotify-auth serverless function (refresh):",
					errorData
				);
				throw new Error(
					errorData.message || "Failed to refresh Spotify token."
				);
			}

			const data = await response.json();
			const newRefreshToken = data.refresh_token || storedRefreshToken;

			setUserAccessToken(data.access_token);
			setRefreshToken(newRefreshToken);
			const expiryTime = Date.now() + data.expires_in * 1000;
			setExpiresAt(expiryTime);

			localStorage.setItem("spotify_access_token", data.access_token);
			localStorage.setItem("spotify_refresh_token", newRefreshToken);
			localStorage.setItem("spotify_token_expires_at", expiryTime);

			return data.access_token;
		} catch (error) {
			console.error("Error refreshing Spotify token:", error);
			setUserAccessToken(null);
			setRefreshToken(null);
			setExpiresAt(0);
			localStorage.clear();
			return null;
		}
	}, []); 

	const getPublicAccessToken = useCallback(async () => {
		try {
			const response = await fetch("/api/public-auth", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				const errorData = await response.json();
				console.error(
					"Error from /api/public-auth serverless function:",
					errorData
				);
				throw new Error(
					"Failed to get public access token from serverless function."
				);
			}

			const data = await response.json();
			setPublicAccessToken(data.access_token);
		} catch (error) {
			console.error(
				"Error calling serverless function for public token:",
				error
			);
		}
	}, []);

	const exchangeAuthorizationCodeForTokens = useCallback(async (code) => {
		const codeVerifier = localStorage.getItem("code_verifier");
		localStorage.removeItem("code_verifier");

		if (!codeVerifier) {
			console.error(
				"Error: code_verifier not found in localStorage during token exchange."
			);
			return;
		}

		try {
			const response = await fetch("/api/spotify-auth", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					authorizationCode: code,
					codeVerifier: codeVerifier,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				console.error(
					"Error from /api/spotify-auth serverless function:",
					errorData
				);
				throw new Error(
					errorData.message ||
						"Failed to get Spotify tokens from backend."
				);
			}

			const data = await response.json();
			setUserAccessToken(data.access_token);
			setRefreshToken(data.refresh_token);
			const expiryTime = Date.now() + data.expires_in * 1000;
			setExpiresAt(expiryTime);

			localStorage.setItem("spotify_access_token", data.access_token);
			localStorage.setItem("spotify_refresh_token", data.refresh_token);
			localStorage.setItem("spotify_token_expires_at", expiryTime);

			window.history.replaceState(
				{},
				document.title,
				window.location.pathname
			);
		} catch (error) {
			console.error("Error exchanging code:", error);
			setUserAccessToken(null);
			setRefreshToken(null);
			setExpiresAt(0);
			localStorage.clear();
		}
	}, []);

	const makeAuthenticatedRequest = useCallback(
		async (url, method, data) => {
			let currentAccessToken = userAccessToken || publicAccessToken;

			const headers = {
				"Content-Type": "application/json",
				...(currentAccessToken && {
					Authorization: `Bearer ${currentAccessToken}`,
				}),
			};

			try {
				const response = await fetch(
					`https://api.spotify.com/v1/${url}`,
					{
						method: method,
						headers: headers,
						body: data ? JSON.stringify(data) : undefined,
					}
				);

				if (response.status === 401 || response.status === 403) {
					if (userAccessToken) {
						console.warn(
							"User token expired or unauthorized. Attempting refresh."
						);
						const newAccessToken = await refreshAccessToken();
						if (newAccessToken) {
							currentAccessToken = newAccessToken;
							headers[
								"Authorization"
							] = `Bearer ${currentAccessToken}`;
							const retryResponse = await fetch(
								`https://api.spotify.com/v1/${url}`,
								{
									method: method,
									headers: headers,
									body: data
										? JSON.stringify(data)
										: undefined,
								}
							);
							if (retryResponse.ok) {
								const text = await retryResponse.text();
								return text ? JSON.parse(text) : null;
							} else {
								const errorText = await retryResponse.text();
								throw new Error(
									`HTTP error on retry! status: ${retryResponse.status} - ${errorText}`
								);
							}
						} else {
							console.error(
								"Failed to refresh token, user needs to re-authenticate."
							);
							setUserAccessToken(null);
							setRefreshToken(null);
							setExpiresAt(0);
							localStorage.clear();
							throw new Error(
								"User session expired. Please log in again."
							);
						}
					} else if (publicAccessToken) {
						console.warn(
							"Public key token failed. Attempting to get new public token."
						);
						setPublicAccessToken(null);
						await getPublicAccessToken();
						throw new Error(
							"Public token refreshed, please retry search."
						);
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
				const text = await response.text();
				return text ? JSON.parse(text) : null;
			} catch (error) {
				console.error(`request to ${url} failed`, error);
				throw error;
			}
		},
		[
			userAccessToken,
			publicAccessToken,
			refreshAccessToken,
			getPublicAccessToken,
		]
	);

	const getUserProfileId = useCallback(async () => {
		const url = "me";
		try {
			const response = await makeAuthenticatedRequest(url, "GET", null);
			setUserProfileId(response.id);
		} catch (error) {
			console.error("Error getting user profile ID:", error);
		}
	}, [makeAuthenticatedRequest]); 


	useEffect(() => {
		const storedAccessToken = localStorage.getItem("spotify_access_token");
		const storedRefreshToken = localStorage.getItem(
			"spotify_refresh_token"
		);
		const storedExpiresAt = parseInt(
			localStorage.getItem("spotify_token_expires_at"),
			10
		);
		const urlParams = new URLSearchParams(window.location.search);
		const code = urlParams.get("code");

		if (code) {
			exchangeAuthorizationCodeForTokens(code);
		} else if (storedAccessToken && storedExpiresAt > Date.now()) {
			setUserAccessToken(storedAccessToken);
			setRefreshToken(storedRefreshToken);
			setExpiresAt(storedExpiresAt);
		} else if (storedRefreshToken) {
			refreshAccessToken();
		} else {
			getPublicAccessToken();
		}
	}, [
		exchangeAuthorizationCodeForTokens,
		refreshAccessToken,
		getPublicAccessToken,
	]);

	useEffect(() => {
		if (userAccessToken && !userProfileId) {
			getUserProfileId();
		}
	}, [userAccessToken, userProfileId, getUserProfileId]);

	useEffect(() => {
		const interval = setInterval(() => {
			if (userAccessToken && expiresAt < Date.now() && refreshToken) {
				refreshAccessToken();
			}
		}, 5 * 60 * 1000);

		return () => clearInterval(interval);
	}, [userAccessToken, expiresAt, refreshToken, refreshAccessToken]);


	async function spotifyLogin() {
		const codeVerifier = generateRandomString(64);
		const hashed = await sha256(codeVerifier);
		const codeChallenge = base64encode(hashed);
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

	async function searchSpotify(searchTerm) {
		const endpoint = "search";
		const type = "track";
		const limit = 10;
		const params = new URLSearchParams();
		params.append("q", searchTerm);
		params.append("type", type);
		params.append("limit", limit);
		const url = `${endpoint}?${params.toString()}`;
		const response = await makeAuthenticatedRequest(url, "GET", null);
		if (response && response.tracks && response.tracks.items) {
			const tracks = response.tracks.items.map((track) => ({
				...track,
				isInPlaylist: false,
			}));
			return tracks;
		} else {
			console.log("No tracks found.");
			return [];
		}
	}

	async function handleSearch(searchTerm) {
		const trackData = await searchSpotify(searchTerm);

		setTracks((prev) => {
			const existingPlaylistTracks = prev.filter(
				(track) => track.isInPlaylist
			);
			const existingTrackIds = new Set(
				existingPlaylistTracks.map((track) => track.id)
			);

			const newTracksToAdd = trackData
				.filter((track) => !existingTrackIds.has(track.id))
				.map((track) => ({ ...track, isInPlaylist: false }));

			return [...existingPlaylistTracks, ...newTracksToAdd];
		});
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

export default App;
