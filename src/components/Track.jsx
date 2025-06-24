import styles from "../styles/modules/Track.module.css";
function Track({uri, title, artist, album, isInPlaylist, togglePlaylist}) {
		return (
		<div className={styles.track}>
			<div>
				<h3>{title}</h3>
				<p>{artist} | {album}</p>
			</div>
			<button onClick={() => togglePlaylist(uri)}>{isInPlaylist? "-" : "+"}</button>
		</div>
	);
}

export default Track;

