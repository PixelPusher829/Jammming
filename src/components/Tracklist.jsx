import Track from "./Track";

function Tracklist({tracks, togglePlaylist}) {
	return (
		<div>
			{tracks
				.filter((track) => !track.isInPlaylist)
				.map((track) => (
					<Track
						key={track.uri}
						uri={track.uri}
						title={track.title}
						artist={track.artist}
						album={track.album}
						isInPlaylist={track.isInPlaylist}
						togglePlaylist={togglePlaylist}
					/>
				))}
		</div>
	);
}

export default Tracklist;
