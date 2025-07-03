import Tracklist from "./Tracklist";

function SearchResults({tracks, togglePlaylist}) {
	return (
		<div>
			<h2>Search Results</h2>
			<Tracklist
				tracks={tracks}
				togglePlaylist={togglePlaylist}
			/>
		</div>
	);
}

export default SearchResults;
