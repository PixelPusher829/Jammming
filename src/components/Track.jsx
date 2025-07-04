import styles from "../styles/modules/Track.module.css";
function Track({name, artists, album, id, isInPlaylist, togglePlaylist}) {
		return (
			<div className={styles.track}>
				<div>
					<h3>{name}</h3>
					<p>
						{artists.map((artist) => artist.name).join(", ")} |{" "}
						{album.name}
					</p>
				</div>
				<button onClick={() => togglePlaylist(id)}>
					{isInPlaylist ? "-" : "+"}
				</button>
			</div>
		);
}

export default Track;
