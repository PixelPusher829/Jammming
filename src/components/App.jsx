import "../styles/App.css";
import SearchBar from "./SearchBar";
import Playlist from "./Playlist";
import Tracklist from "./Tracklist";

function App() {
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
					<Tracklist />
					<Playlist />
				</div>
			</main>
		</>
	);
}

export default App;
