# Commander Astley

This is the brain of our infrastructure. It calculates importances of pixels, job order and such as shown [here](https://www.youtube.com/watch?v=dQw4w9WgXcQ).

This server won't be used for direct connections to clients.
The clients will connect to an auth server, that is connected through a live connection to this server.

# Auth Server

This server will be used for authentication and griefer prevention. It's code is currently located in the ./auth folder.
