// Handling Database

import sqlite3 from "sqlite3";
import { open } from "sqlite";
import "dotenv/config";
import { generateAllPairings, getLastWednesdayFromNow } from "./utils";
import { DateTime } from "luxon";

export class DBClient {
	/** @type {Awaited<ReturnType<typeof open>>} */
	db;

	async init(filename) {
		this.db = await open({
			filename: filename,
			driver: sqlite3.Database,
		});

		return this;
	}
	/**
	 * Get beboere
	 * @param {string} name
	 * @returns {Promise<{name: string, birthday: string, discordId: string}>}
	 */
	getBeboer(name) {
		return this.db.get("SELECT * FROM beboere WHERE name = ?", name);
	}

	/**
	 * Get all beboere
	 * @returns {Promise<{name: string, birthday: string, discordId: string}[]>}
	 */
	getAllBeboer() {
		return this.db.all("SELECT * FROM beboere");
	}

	/** Get last mumsdag
	 * @returns {Promise<{date: string, mainChefId: number, sousChefId: number} | undefined>}
	 */
	getLastMumsdag() {
		return this.db.get(
			"SELECT * FROM mumsdag WHERE archived = 0 ORDER BY date DESC LIMIT 1",
		);
	}

	getAllMumsdag() {
		return this.db.all("SELECT * FROM mumsdag WHERE archived = 0");
	}

	/**
	 * Get mumsdage
	 * @param {{date?: string, after?: string, before?: string, limit?: number}} opts
	 * @returns {Promise<{date: string, mainChefId: number, sousChefId: number}[]>}
	 */
	getMumsdag(opts = {}) {
		const { date, after, before, limit = 10 } = opts;
		if (date) {
			return this.db.get("SELECT * FROM mumsdag WHERE date = ?", date);
		}

		let query = "SELECT * FROM mumsdag WHERE archived = 0";
		if (after) {
			query += " AND date > ? ";
		}

		if (before) {
			query += " AND date < ? ";
		}

		query += " ORDER BY date ASC LIMIT ?";
		return this.db.all(query, ...[after, before].filter(Boolean), limit);
	}

	/** Add new mumsdag pairings
	 * @param {string | undefined} fromDate
	 */
	async addNewMumsdagPairings(fromDate) {
		const pairings = generateAllPairings(10);
		const lastMumsdag = await this.getLastMumsdag();
		let date = DateTime.fromISO(
			fromDate ?? lastMumsdag?.date ?? getLastWednesdayFromNow().toISOString(),
		);

		await this.insertMumsdag(
			pairings.map(([x, y]) => {
				date = date.plus({ weeks: 1 });
				return {
					date: date.toISO(),
					mainChefId: x,
					sousChefId: y,
				};
			}),
		);
	}

	/**
	 * Insert a mumsdag
	 * @param {{date: string, mainChefId: number, sousChefId: number}[]} days
	 */
	async insertMumsdag(days) {
		const stmt = await this.db.prepare(
			"INSERT INTO mumsdag (date, mainChefId, sousChefId) VALUES (?, ?, ?)",
		);
		for (const day of days) {
			await stmt.run(
				new Date(day.date).toISOString(),
				day.mainChefId,
				day.sousChefId,
			);
		}
	}

	/** Archive mumsdag
	 * @param {string} date
	 */
	archiveMumsdag(date) {
		return this.db.run(
			"UPDATE mumsdag SET archived = 1 WHERE date = ?",
			new Date(date).toISOString(),
		);
	}

	/**
	 * Delete mumsdag or all earlier mumsdag from now
	 * @param {string} date
	 */
	deleteMumsdag(date) {
		if (date) {
			return this.db.run(
				"DELETE FROM mumsdag WHERE date = ?",
				new Date(date).toISOString(),
			);
		}

		// Delete earlier mumsdags from now
		return this.db.run(
			"DELETE FROM mumsdag WHERE date < ?",
			new Date().toISOString(),
		);
	}

	async clear(beboere = false) {
		await this.db.run("DELETE FROM mumsdag");
		if (beboere) await this.db.run("DELETE FROM beboere");
	}

	/** Create database tables */
	async migrate(clear = false) {
		console.log("Migrating database...");

		try {
			if (clear) {
				await this.db.run("DROP TABLE IF EXISTS mumsdag");
				await this.db.run("DROP TABLE IF EXISTS beboere");
			}

			// Beboer table
			console.log("Creating beboere table...");
			await this.db.run(
				`CREATE TABLE IF NOT EXISTS beboere (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name TEXT NOT NULL UNIQUE,
				birthday TEXT NOT NULL,
				discord_id TEXT NOT NULL
				)`,
			);

			console.log("Inserting users...");
			const stmt = await this.db.prepare(
				"INSERT OR IGNORE INTO beboere (name, birthday, discord_id) VALUES (?, ?, ?)",
			);

			for (const b of beboere) {
				await stmt.run(b.name, b.birthday, b.discordId);
			}

			// mumsdag table
			console.log("Creating mumsdag table...");
			await this.db.run(
				`CREATE TABLE IF NOT EXISTS mumsdag (
				date TEXT PRIMARY KEY,
				mainChefId INTEGER NOT NULL,
				sousChefId INTEGER NOT NULL,
				archived BOOLEAN NOT NULL DEFAULT 0,
				FOREIGN KEY(mainChefId) REFERENCES beboere(id),
				FOREIGN KEY(sousChefId) REFERENCES beboere(id)
				)`,
			);
		} catch (err) {
			console.error(err);
			process.exit(1);
		}

		console.log("Database migrated successfully!");
	}
}

export const dbclient = await new DBClient().init("./brinkenbot.db");

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
