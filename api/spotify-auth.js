import { Buffer } from "buffer";

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({
			error: "Method Not Allowed",
			message: "This endpoint only supports POST requests.",
		});
	}

	const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
	const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
	const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;
	console.log("Backend REDIRECT_URI received:", REDIRECT_URI); // <<< Add this

	if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
		return res.status(500).json({
			error: "Server configuration error",
			message: "Missing Spotify API credentials or Redirect URI.",
		});
	}

	const authHeaderString = Buffer.from(
		`${CLIENT_ID}:${CLIENT_SECRET}`
	).toString("base64");

	const requestBody = new URLSearchParams();
	let isRefresh = false;

	if (req.body && req.body.authorizationCode) {
		requestBody.append("grant_type", "authorization_code");
		requestBody.append("code", req.body.authorizationCode);
		requestBody.append("redirect_uri", REDIRECT_URI);

		if (req.body.codeVerifier) {
			requestBody.append("code_verifier", req.body.codeVerifier);
		} else {
			return res.status(400).json({
				error: "Bad Request",
				message: "Missing code_verifier for PKCE.",
			});
		}
	} else if (req.body && req.body.refreshToken) {
		requestBody.append("grant_type", "refresh_token");
		requestBody.append("refresh_token", req.body.refreshToken);
		isRefresh = true;
	} else {
		return res.status(400).json({
			error: "Bad Request",
			message:
				"Missing authorizationCode or refreshToken in request body.",
		});
	}

	try {
		console.log(
			"Backend redirect URI being sent to Spotify:",
			REDIRECT_URI
		);
		console.log("Backend requestBody toString():", requestBody.toString());

		const spotifyResponse = await fetch(
			"https://accounts.spotify.com/api/token",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Basic ${authHeaderString}`,
				},
				body: requestBody.toString(),
			}
		);

		const data = await spotifyResponse.json();

		if (!spotifyResponse.ok) {
			console.error("Spotify API Refresh Token Error:", data);
		} else {
			console.log("Spotify API Refresh Token Success Response:", data);
		}

		if (spotifyResponse.ok) {
			if (isRefresh) {
				res.status(200).json({
					access_token: data.access_token,
					refresh_token: data.refresh_token || req.body.refreshToken,
				});
			} else {
				res.status(200).json({
					access_token: data.access_token,
					refresh_token: data.refresh_token,
				});
			}
		} else {
			console.error("Spotify API Error (Auth):", data);
			res.status(spotifyResponse.status).json(data);
		}
	} catch (error) {
		console.error("Serverless Function Error (Auth):", error);
		res.status(500).json({
			error: "Internal Server Error",
			message: error.message,
		});
	}
}
