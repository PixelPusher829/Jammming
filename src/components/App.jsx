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
	const [isProcessingAuth, setIsProcessingAuth] = useState(false);

	// --- Authentication Callbacks (no changes here from last version) ---
	const refreshAccessToken = useCallback(async () => {
		setIsProcessingAuth(true);
		const storedRefreshToken = localStorage.getItem(
			"spotify_refresh_token"
		);

		if (!storedRefreshToken) {
			setUserAccessToken(null);
			setRefreshToken(null);
			setExpiresAt(0);
			localStorage.clear();
			setIsProcessingAuth(false);
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
				throw new Error(
					errorData.message || "Failed to refresh Spotify token."
				);
			}

			const data = await response.json();
			const newRefreshToken = data.refresh_token || storedRefreshToken;

			setUserAccessToken(data.access_token);
			setRefreshToken(newRefreshToken);
			const expiryTime =
				Date.now() + data.expires_in * 1000 - 5 * 60 * 1000; // Keep this for proactive refresh
			setExpiresAt(expiryTime);

			localStorage.setItem("spotify_access_token", data.access_token);
			localStorage.setItem("spotify_refresh_token", newRefreshToken);
			localStorage.setItem("spotify_token_expires_at", expiryTime);

			return data.access_token;
		} catch (error) {
			setUserAccessToken(null);
			setRefreshToken(null);
			setExpiresAt(0);
			localStorage.clear();
			return null;
		} finally {
			setIsProcessingAuth(false);
		}
	}, []);

	const getPublicAccessToken = useCallback(async () => {
		setIsProcessingAuth(true);
		try {
			const response = await fetch("/api/public-auth", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(
					errorData.message ||
						"Failed to get public access token from serverless function."
				);
			}

			const data = await response.json();
			setPublicAccessToken(data.access_token);
			return data.access_token;
		} catch (error) {
			console.error("Error fetching public access token:", error);
			setPublicAccessToken(null);
			return null;
		} finally {
			setIsProcessingAuth(false);
		}
	}, []);

	const exchangeAuthorizationCodeForTokens = useCallback(async (code) => {
		setIsProcessingAuth(true);
		const codeVerifier = localStorage.getItem("code_verifier");
		if (!codeVerifier) {
			console.error(
				"Final Check: code_verifier still not found, throwing error."
			);
			setIsProcessingAuth(false);
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
				console.error("API response error:", errorData);
				throw new Error(
					errorData.message ||
						"Failed to get Spotify tokens from backend."
				);
			}

			const data = await response.json();

			localStorage.removeItem("code_verifier");

			setUserAccessToken(data.access_token);
			setRefreshToken(data.refresh_token);
			const expiryTime =
				Date.now() + data.expires_in * 1000 - 5 * 60 * 1000; // Keep this for proactive refresh
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
			console.error("Error during token exchange process:", error);
			setUserAccessToken(null);
			setRefreshToken(null);
			setExpiresAt(0);
			localStorage.clear();
		} finally {
			setIsProcessingAuth(false);
		}
	}, []);

	const makeAuthenticatedRequest = useCallback(
		async (url, method, data) => {
			let currentAccessToken = userAccessToken || publicAccessToken;

			const headers = (token) => ({
				"Content-Type": "application/json",
				...(token && { Authorization: `Bearer ${token}` }),
			});

			const performFetch = async (token) => {
				return await fetch(`https://api.spotify.com/v1/${url}`, {
					method: method,
					headers: headers(token),
					body: data ? JSON.stringify(data) : undefined,
				});
			};

			try {
				let response = await performFetch(currentAccessToken);

				if (response.status === 401 || response.status === 403) {
					if (userAccessToken) {
						const newAccessToken = await refreshAccessToken();
						if (newAccessToken) {
							response = await performFetch(newAccessToken);
						} else {
							setUserAccessToken(null);
							setRefreshToken(null);
							setExpiresAt(0);
							localStorage.clear();
							throw new Error(
								"User session expired. Please log in again."
							);
						}
					} else if (publicAccessToken) {
						const newPublicToken = await getPublicAccessToken();
						if (newPublicToken) {
							response = await performFetch(newPublicToken);
						} else {
							throw new Error(
								"Failed to acquire new public token."
							);
						}
					} else {
						throw new Error(
							"Authentication/Authorization failed for request. No active token."
						);
					}
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
				console.error("Error in makeAuthenticatedRequest:", error);
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
			if (response && response.id) {
				setUserProfileId(response.id);
			}
		} catch (error) {
			console.error("Error fetching user profile ID:", error);
		}
	}, [makeAuthenticatedRequest]);

	// --- Primary Authentication Effect ---
	useEffect(() => {
		if (isProcessingAuth) {
			return;
		}

		const urlParams = new URLSearchParams(window.location.search);
		const code = urlParams.get("code");
		const hasProcessedCode = sessionStorage.getItem(
			`processedCode_${code}`
		);

		// Scenario 1: Initial redirect from Spotify with an auth code
		if (code && !userAccessToken && !hasProcessedCode) {
			sessionStorage.setItem(`processedCode_${code}`, "true");
			exchangeAuthorizationCodeForTokens(code);
			return; // Exit: Exchange initiated, wait for next render
		}

		// Scenario 2: User token is already valid in state
		if (userAccessToken && expiresAt > Date.now()) {
			return; // Exit: User token is valid, no action needed
		}

		// --- If no valid userAccessToken in state, try localStorage ---
		const storedAccessToken = localStorage.getItem("spotify_access_token");
		const storedRefreshToken = localStorage.getItem(
			"spotify_refresh_token"
		);
		const storedExpiresAt = parseInt(
			localStorage.getItem("spotify_token_expires_at"),
			10
		);

		// Scenario 3: Load valid user token from localStorage if not in state
		if (storedAccessToken && storedExpiresAt > Date.now()) {
			setUserAccessToken(storedAccessToken);
			setRefreshToken(storedRefreshToken);
			setExpiresAt(storedExpiresAt);
			return; // Exit: Token loaded from storage, state updated
		}

		// Scenario 4: Refresh expired user token from localStorage
		if (
			storedRefreshToken &&
			(!userAccessToken || expiresAt <= Date.now())
		) {
			refreshAccessToken();
			return; // Exit: Refresh initiated, wait for next render
		}

		// Scenario 5: If no user tokens (neither in state nor localStorage), get public token
		if (!publicAccessToken) {
			getPublicAccessToken();
			// No return here, as publicAccessToken update won't necessarily stop the effect immediately
			// and it might not prevent other state changes from causing a re-run.
			// The isProcessingAuth guard helps.
		}
	}, [
		exchangeAuthorizationCodeForTokens,
		refreshAccessToken,
		getPublicAccessToken,
		userAccessToken, // Crucial dependency
		publicAccessToken, // Crucial dependency
		expiresAt, // Crucial dependency
		isProcessingAuth, // Crucial dependency
	]);

	// --- Other Effects (remain the same) ---
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

		try {
			window.localStorage.setItem("code_verifier", codeVerifier);
		} catch (e) {
			console.error("Error storing code_verifier in localStorage:", e);
		}

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
		if (!searchTerm || searchTerm.trim() === "") {
			return []; // Prevent searching with empty query
		}
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
			return [];
		}
	}

	async function handleSearch(searchTerm) {
		if (!searchTerm || searchTerm.trim() === "") {
			setTracks([]);
			return;
		}
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