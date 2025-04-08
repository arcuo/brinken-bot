import { handleDay } from "./libs/handleDay";

console.log("Starting");

Bun.serve({
	port: process.env.PORT ?? 3000,
	routes: {
		"/keep-alive": new Response("OK", { status: 200 }),
		"/handle-day": {
			POST: async (req, res) => {
				await handleDay();
				return new Response("OK", { status: 200 });
			},
		},
	},
});

console.log("Discord App Initialized And Running");
