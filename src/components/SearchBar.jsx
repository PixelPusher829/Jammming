
import styles from "../styles/modules/SearchBar.module.css";
import {useState} from "react";

function SearchBar() {
	const [searchTerm, setSearchTerm] = useState("");

	return (
		<form className={styles.searchbar}>
			<button type="submit">
				<i className={`fi fi-br-search ${styles.icon}`}></i>
			</button>
			<input
				type="text"
				onChange={(e) => setSearchTerm(e.target.value)}
				placeholder="Enter a song name"
				value={searchTerm}
			/>
		</form>
	);
}

export default SearchBar;
