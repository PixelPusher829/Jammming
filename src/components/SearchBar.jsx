import styles from "../styles/modules/SearchBar.module.css";
import {useState} from "react";

function SearchBar() {
	const [searchTerm, setSearchTerm] = useState("Enter a song name");

	return (
		<form className={styles.searchbar}>
			<i class="fi fi-br-search"></i>
			<input 
                type="text"
				onChange={(e) => setSearchTerm(e.target.value)}
				value={searchTerm}
			/>
		</form>
	);
}

export default SearchBar;
