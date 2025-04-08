import { DBClient } from "../libs/db";
import { describe, it, beforeEach, expect } from "bun:test";

describe("DB tests", async () => {
	const db = new DBClient(":memory:");
	db.migrate();

	beforeEach(async () => {
		db.clear();
	});

	it("getBeboer", async () => {
		const beboer = db.getBeboer("Bemi");
		expect(beboer).toBeDefined();
		expect(beboer?.name).toBe("Bemi");
		expect(beboer?.birthday).toBe("1993-09-24");
	});

	it("getAllBeboer", async () => {
		const beboer = db.getAllBeboer();
		expect(beboer).toBeDefined();
		expect(beboer.length).toBe(9);
	});

	describe("mumsdag", () => {
		it("insertMumsdag", async () => {
			const date = new Date("2023-09-24");
			db.insertMumsdag([
				{ date: date.toISOString(), mainChefId: 1, sousChefId: 2 },
			]);

			const mumsdag = db.getMumsdag({ date: date.toISOString() });

			expect(mumsdag).toBeDefined();
			expect(mumsdag?.date).toBe(date.toISOString());
			expect(mumsdag?.mainChefId).toBe(1);
			expect(mumsdag?.sousChefId).toBe(2);
		});

		it("deleteMumsdag", () => {
			const date1 = new Date("2023-09-25");
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			db.insertMumsdag([
				{ date: date1.toISOString(), mainChefId: 1, sousChefId: 2 },
				{ date: tomorrow.toISOString(), mainChefId: 2, sousChefId: 3 },
			]);
			expect(db.getMumsdag()?.length).toBe(2);
			db.deleteMumsdag();
			expect(db.getMumsdag()?.length).toBe(1);
			db.deleteMumsdag(tomorrow.toISOString());
			expect(db.getMumsdag()?.length).toBe(0);
		});

		it("archiveMumsdag", async () => {
			const date1 = new Date("2023-09-25");
			const date2 = new Date("2023-09-26");

			db.insertMumsdag([
				{ date: date1.toISOString(), mainChefId: 1, sousChefId: 2 },
				{ date: date2.toISOString(), mainChefId: 2, sousChefId: 3 },
			]);

			expect(db.getMumsdag().length).toBe(2);
			db.archiveMumsdag(date1.toISOString());
			expect(db.getMumsdag().length).toBe(1);
			db.archiveMumsdag(date2.toISOString());
			expect(db.getMumsdag().length).toBe(0);
		});

		it("getMumsdag", async () => {
			const date1 = new Date("2023-09-25");
			const date2 = new Date("2023-09-26");

			db.insertMumsdag([
				{ date: date1.toISOString(), mainChefId: 1, sousChefId: 2 },
				{ date: date2.toISOString(), mainChefId: 2, sousChefId: 3 },
			]);

			expect(db.getMumsdag()).toHaveLength(2);

			expect(db.getMumsdag({ after: date1.toISOString() })).toHaveLength(1);
			expect(db.getMumsdag({ before: date2.toISOString() })).toHaveLength(1);

			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			db.insertMumsdag([
				{ date: yesterday.toISOString(), mainChefId: 1, sousChefId: 2 },
				{ date: tomorrow.toISOString(), mainChefId: 1, sousChefId: 2 },
			]);

			const mumsdag = db.getMumsdag({ date: yesterday.toISOString() });
			expect(mumsdag).toBeDefined();
			expect(mumsdag?.date).toBe(yesterday.toISOString());

			const nextMumsdag = db.getMumsdag({ date: tomorrow.toISOString() });
			expect(nextMumsdag).toBeDefined();
			expect(nextMumsdag?.date).toBe(tomorrow.toISOString());
		});

		it("getLastMumsdag", async () => {
			expect(db.getLastMumsdag()).toBeUndefined();

			db.insertMumsdag([
				{
					date: new Date("2023-09-25").toISOString(),
					mainChefId: 1,
					sousChefId: 2,
				},
				{
					date: new Date("2023-09-26").toISOString(),
					mainChefId: 2,
					sousChefId: 3,
				},
			]);

			const lastMumsdag = db.getLastMumsdag();
			expect(lastMumsdag).toBeDefined();
			expect(lastMumsdag?.date).toBe(new Date("2023-09-26").toISOString());
		});

		it("addNewMumsdagPairings", async () => {
			db.addNewMumsdagPairings();
			const allMumsdag = db.getMumsdag();
			expect(allMumsdag).toHaveLength(10);
		});
	});
});
