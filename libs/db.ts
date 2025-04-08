// Handling Database

import { Database } from "bun:sqlite";
import { open } from "sqlite";
import { generateAllPairings, getLastWednesdayFromNow } from "./utils.js";
import { DateTime } from "luxon";

export type User = {
	id: number;
	name: string;
	birthday: string;
	discordId: string;
};

export type Mumsdag = {
	date: string;
	mainChefId: number;
	sousChefId: number;
};

export class DBClient {
	db: Database;

	constructor(filename) {
		this.db = new Database(filename);
	}
	/**
	 * Get beboere
	 */
	getBeboer(name: string) {
		return this.db
			.query<User, string>("SELECT * FROM beboere WHERE name = ?")
			.get(name);
	}

	/**
	 * Get all beboere
	 */
	getAllBeboer() {
		return this.db.query<User, []>("SELECT * FROM beboere").all();
	}

	/** Get last mumsdag
	 */
	getLastMumsdag() {
		return (
			this.db
				.query<Mumsdag, []>(
					"SELECT * FROM mumsdag WHERE archived = 0 ORDER BY date DESC LIMIT 1",
				)
				.get() ?? undefined
		);
	}

	getAllMumsdag() {
		return this.db
			.query<Mumsdag, []>(
				"SELECT * FROM mumsdag WHERE archived = 0 ORDER BY date ASC",
			)
			.all();
	}

	getAllMumsdagWithChefs() {
		// Join with beboere table to get main chef and sous chef
		// Set mainChef to be the main chef and sousChef to be the sous chef
		return this.db
			.query<
				Mumsdag & {
					mainChefName: string;
					sousChefName: string;
					mainChefDiscordId: string;
					sousChefDiscordId: string;
				},
				[]
			>(
				`
			SELECT md.*, b.name as mainChefName, b2.name as sousChefName, b.discord_id as mainChefDiscordId, b2.discord_id as sousChefDiscordId
			FROM mumsdag md
			JOIN beboere b ON b.id = md.mainChefId
			JOIN beboere b2 ON b2.id = md.sousChefId
			WHERE md.archived = 0 ORDER BY date ASC
			`,
			)
			.all();
	}

	getMumsdag<
		TOpts extends
			| {
					date?: string;
					after?: string;
					before?: string;
					limit?: number;
			  }
			| undefined,
	>(
		opts?: TOpts,
	): TOpts extends { date: string } ? Mumsdag | undefined : Mumsdag[] {
		const { date, after, before, limit = 10 } = opts ?? {};
		if (date) {
			return (
				this.db
					.query<Mumsdag, string>("SELECT * FROM mumsdag WHERE date = ?")
					// biome-ignore lint/suspicious/noExplicitAny: <explanation>
					.get(date) as any
			);
		}

		let query = "SELECT * FROM mumsdag WHERE archived = 0";
		if (after) {
			query += " AND date > ? ";
		}

		if (before) {
			query += " AND date < ? ";
		}

		query += " ORDER BY date ASC LIMIT ?";
		return this.db.query<Mumsdag, [string, string, number]>(query).all(
			...([after, before].filter(Boolean) as [string, string]),
			limit,
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		) as any;
	}

	/** Add new mumsdag pairings
	 * returns the last date added
	 */
	addNewMumsdagPairings(fromDate?: string) {
		const pairings = generateAllPairings(10);
		const lastMumsdag = this.getLastMumsdag();
		let date = DateTime.fromISO(
			fromDate ?? lastMumsdag?.date ?? getLastWednesdayFromNow().toISOString(),
		);

		this.insertMumsdag(
			pairings.map(([x, y]) => {
				date = date.plus({ weeks: 1 });
				return {
					// biome-ignore lint/style/noNonNullAssertion: <explanation>
					date: date.toISO()!,
					mainChefId: x,
					sousChefId: y,
				};
			}),
		);

		return date;
	}

	/**
	 * Insert a mumsdag
	 * @param {{date: string, mainChefId: number, sousChefId: number}[]} days
	 */
	insertMumsdag(
		days: { date: string; mainChefId: number; sousChefId: number }[],
	) {
		const stmt = this.db.prepare(
			"INSERT INTO mumsdag (date, mainChefId, sousChefId) VALUES (?, ?, ?)",
		);
		for (const day of days) {
			stmt.run(
				new Date(day.date).toISOString(),
				day.mainChefId,
				day.sousChefId,
			);
		}
	}

	/** Archive mumsdag
	 */
	archiveMumsdag(date: string) {
		return this.db
			.prepare("UPDATE mumsdag SET archived = 1 WHERE date = ?")
			.run(new Date(date).toISOString());
	}

	/**
	 * Delete mumsdag or all earlier mumsdag from now
	 */
	deleteMumsdag(date?: string) {
		if (date) {
			return this.db
				.prepare("DELETE FROM mumsdag WHERE date = ?")
				.run(new Date(date).toISOString());
		}

		// Delete earlier mumsdags from now
		return this.db
			.prepare("DELETE FROM mumsdag WHERE date < ?")
			.run(new Date().toISOString());
	}

	clear(beboere = false) {
		this.db.run("DELETE FROM mumsdag");
		if (beboere) this.db.run("DELETE FROM beboere");
	}

	/** Create database tables */
	migrate(clear = false) {
		console.log("Migrating database...");

		try {
			if (clear) {
				this.db.run("DROP TABLE IF EXISTS mumsdag");
				this.db.run("DROP TABLE IF EXISTS beboere");
			}

			// Beboer table
			console.log("Creating beboere table...");
			this.db.run(
				`CREATE TABLE IF NOT EXISTS beboere (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name TEXT NOT NULL UNIQUE,
				birthday TEXT NOT NULL,
				discord_id TEXT NOT NULL
				)`,
			);

			console.log("Inserting users...");
			const stmt = this.db.prepare(
				"INSERT OR IGNORE INTO beboere (name, birthday, discord_id) VALUES (?, ?, ?)",
			);

			for (const b of beboere) {
				stmt.run(b.name, b.birthday, b.discordId);
			}

			// mumsdag table
			console.log("Creating mumsdag table...");
			this.db.run(
				`CREATE TABLE IF NOT EXISTS mumsdag (
				date TEXT PRIMARY KEY,
				mainChefId INTEGER NOT NULL,
				sousChefId INTEGER NOT NULL,
				archived BOOLEAN NOT NULL DEFAULT 0,
				FOREIGN KEY(mainChefId) REFERENCES beboere(id),
				FOREIGN KEY(sousChefId) REFERENCES beboere(id)
				)`,
			);

			console.log("Inserting mumsdage...");
			this.addNewMumsdagPairings();
		} catch (err) {
			console.error(err);
			process.exit(1);
		}

		console.log("Database migrated successfully!");
	}
}

export const dbclient = await new DBClient("./brinkenbot.db");

const beboere = [
	{ name: "Emil", birthday: "1994-05-26", discordId: "1344338879490293835" },
	{ name: "Bemi", birthday: "1993-09-24", discordId: "211877936087695362" },
	{ name: "Anne", birthday: "1993-12-07", discordId: "1289983882241769573" },
	{ name: "Anna", birthday: "2003-08-27", discordId: "1330597579460841474" },
	{ name: "Morten", birthday: "1991-07-28", discordId: "1325809625400086621" },
	{ name: "Rasmus", birthday: "1991-01-13", discordId: "520139245852164096" },
	{ name: "Signe", birthday: "2001-05-03", discordId: "815642393944129566" },
	{ name: "Sidse", birthday: "1999-12-30", discordId: "813061165873627166" },
	{ name: "Søren", birthday: "1993-09-18", discordId: "1289979755013079111" },
];

if (process.argv[2] === "migrate") {
	await dbclient.migrate(process.argv[3] === "clear");
}
