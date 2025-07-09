import { Buffer } from "buffer";

export default async function handler(req, res) {
	const clientId = process.env.SPOTIFY_CLIENT_ID;
	const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

	console.log(`SPOTIFY_CLIENT_ID present: ${!!clientId}`);
	console.log(`SPOTIFY_CLIENT_SECRET present: ${!!clientSecret}`);

	if (!clientId || !clientSecret) {
		console.error(
			"Serverless Function Error: Missing Spotify client ID or secret in environment variables."
		);
		return res.status(500).json({
			error: "Server configuration error: Spotify credentials missing.",
		});
	}

	try {
		const authString = Buffer.from(`${clientId}:${clientSecret}`).toString(
			"base64"
		);
		console.log(
			`Generated auth string (first 10 chars): ${authString.substring(
				0,
				10
			)}...`
		);
		const params = new URLSearchParams();
		params.append("grant_type", "client_credentials");
		console.log("Requesting token with body:", params.toString());

		const spotifyResponse = await fetch(
			"https://accounts.spotify.com/api/token",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Basic ${authString}`,
				},
				body: params,
			}
		);

		console.log("Spotify response status:", spotifyResponse.status);

		const data = await spotifyResponse.json();

		if (!spotifyResponse.ok) {
			console.error("Spotify Token API Error (Serverless):", data);
			return res.status(spotifyResponse.status).json(data);
		}

		console.log("Successfully received access token from Spotify.");
		res.status(200).json({ access_token: data.access_token });
	} catch (error) {
		console.error("Error in spotify-token serverless function:", error);
		res.status(500).json({
			error: "Failed to get public access token via serverless function.",
		});
	}
}
