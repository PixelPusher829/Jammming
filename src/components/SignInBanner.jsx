import styles from "../styles/modules/SignInBanner.module.css";
export default function SignInBanner({ spotifyLogin }) {
    return (
        <>
		<div className={styles.signInBanner}>
			<p>Login to enable playlist saving feature</p>
			<button onClick={spotifyLogin}>Log in to Spotify</button>
		</div>
        </>
	);
}
