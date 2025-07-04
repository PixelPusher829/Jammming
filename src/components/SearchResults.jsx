import Tracklist from "./Tracklist";

function SearchResults({tracks, togglePlaylist}) {
	return (
		<div>
			<h2>Search Results</h2>
			<Tracklist
				togglePlaylist={togglePlaylist}
				tracks={tracks}
			/>
		</div>
	);
}

export default SearchResults;
