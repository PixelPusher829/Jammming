import "../styles/App.css";
import {useState} from "react";
import SearchBar from "./SearchBar";
import Playlist from "./Playlist";
import SearchResults from "./SearchResults";

function App() {
	const [tracks, setTracks] = useState([
		{
			uri: 1,
			title: "Hotel California",
			artist: "Eagles",
			album: "Hotel California",
			isInPlaylist: false,
		},
		{
			uri: 2,
			title: "Stairway to Heaven",
			artist: "Led Zeppelin",
			album: "Led Zeppelin IV",
			isInPlaylist: false,
		},
		{
			uri: 3,
			title: "Imagine",
			artist: "John Lennon",
			album: "Imagine",
			isInPlaylist: false,
		},
	]);

	const togglePlaylist = (uri) => {
		setTracks(
			tracks.map((prev) => {
				if (prev.uri == uri) {
					return {...prev, isInPlaylist: !prev.isInPlaylist};
				}
				return prev;
			})
		);
	};

	return (
		<>
			<header>
				<h1>
					Ja<span>mmm</span>ing
				</h1>
			</header>
			<main>
				<SearchBar />
				<div className="contents">
					<SearchResults tracks={tracks} togglePlaylist={togglePlaylist} />
					<Playlist tracks={tracks} togglePlaylist={togglePlaylist}/>
				</div>
			</main>
		</>
	);
}

export default App;
