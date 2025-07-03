import Track from "./Track";

function Tracklist({tracks, togglePlaylist}) {
	return (
		<div>
			{tracks
				.filter((track) => !track.isInPlaylist)
				.map((track) => (
					<Track
						key={track.id}
						id={track.id}
						name={track.name}
						artists={track.artists}
						album={track.album}
						isInPlaylist={track.isInPlaylist}
						togglePlaylist={togglePlaylist}
					/>
				))}
		</div>
	);
}

export default Tracklist;
