# Jammming

## Project Description

Jammming is a web application that allows users to search for songs on Spotify, create custom playlists, and save them to their Spotify account. It provides a seamless and intuitive interface for music enthusiasts to curate their own collections.

## Features

* **Spotify Search:** Search for millions of songs, artists, and albums directly from Spotify's vast library.

* **Playlist Creation:** Easily add and remove tracks to build your perfect playlist.

* **Save and Update Spotify Playlists:** Authenticate with your Spotify account. When you save a playlist for the first time, it will be created on Spotify. Subsequent modifications to that playlist (including changes to its name or tracks) within Jammming will update the *existing* playlist on your Spotify account, identified by its unique Spotify ID.

* **Responsive Design:** Enjoy a consistent experience across various devices, from desktops to mobile phones.

## Technologies Used

* **React:** For building the user interface.

* **Spotify Web API:** To interact with Spotify's music catalog and user data.

* **HTML5 & CSS3:** For structuring and styling the web application.

* **JavaScript (ES6+):** For application logic.

## How to Run Locally

To get a local copy up and running, follow these simple steps.

### Prerequisites

* Node.js and npm (or yarn) installed on your machine.

* A Spotify Developer account and a registered application to obtain your `Client ID` and `Client Secret`. You'll need to set up a redirect URI for your application (e.g., `http://localhost:3000/`).

### Installation

1. **Clone the repository:**