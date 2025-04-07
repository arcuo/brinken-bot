import { DBClient } from "./db";

describe("DB tests", async () => {
	const db = await new DBClient().init(":memory:");
	await db.migrate();

	beforeEach(async () => {
		await db.clear();
	});

	it("getBeboer", async () => {
		const beboer = await db.getBeboer("Bemi");
		expect(beboer).toBeDefined();
		expect(beboer.name).toBe("Bemi");
		expect(beboer.birthday).toBe("1993-09-24");
	});

	it("getAllBeboer", async () => {
		const beboer = await db.getAllBeboer();
		expect(beboer).toBeDefined();
		expect(beboer.length).toBe(9);
	});

	describe("mumsdag", () => {
		it("insertMumsdag", async () => {
			const date = new Date("2023-09-24");
			await db.insertMumsdag([
				{ date: date.toISOString(), mainChefId: 1, sousChefId: 2 },
			]);

			const mumsdag = await db.getMumsdag();

			expect(mumsdag).toBeDefined();
			expect(mumsdag.date).toBe(date.toISOString());
			expect(mumsdag.mainChefId).toBe(1);
			expect(mumsdag.sousChefId).toBe(2);
		});

		it("deleteMumsdag", async () => {
			const date1 = new Date("2023-09-25");
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			await db.insertMumsdag([
				{ date: date1.toISOString(), mainChefId: 1, sousChefId: 2 },
				{ date: tomorrow.toISOString(), mainChefId: 2, sousChefId: 3 },
			]);
			expect((await db.getAllMumsdag()).length).toBe(2);
			await db.deleteMumsdag();
			expect((await db.getAllMumsdag()).length).toBe(1);
			await db.deleteMumsdag(tomorrow.toISOString());
			expect((await db.getAllMumsdag()).length).toBe(0);
		});

		it("archiveMumsdag", async () => {
			const date1 = new Date("2023-09-25");
			const date2 = new Date("2023-09-26");

			await db.insertMumsdag([
				{ date: date1.toISOString(), mainChefId: 1, sousChefId: 2 },
				{ date: date2.toISOString(), mainChefId: 2, sousChefId: 3 },
			]);

			expect((await db.getAllMumsdag()).length).toBe(2);
			await db.archiveMumsdag(date1.toISOString());
			expect((await db.getAllMumsdag()).length).toBe(1);
			await db.archiveMumsdag(date2.toISOString());
			expect((await db.getAllMumsdag()).length).toBe(0);
		});

		it("getAllMumsdag", async () => {
			const date1 = new Date("2023-09-25");
			const date2 = new Date("2023-09-26");

			await db.insertMumsdag([
				{ date: date1.toISOString(), mainChefId: 1, sousChefId: 2 },
				{ date: date2.toISOString(), mainChefId: 2, sousChefId: 3 },
			]);

			expect(await db.getAllMumsdag()).toHaveLength(2);

			expect(await db.getAllMumsdag({after: date1.toISOString()})).toHaveLength(1);
			expect(await db.getAllMumsdag({before: date2.toISOString()})).toHaveLength(1);
		});

		it("getMumsdag", async () => {
			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			await db.insertMumsdag([
				{ date: yesterday.toISOString(), mainChefId: 1, sousChefId: 2 },
				{ date: tomorrow.toISOString(), mainChefId: 1, sousChefId: 2 },
			]);

			const mumsdag = await db.getMumsdag(yesterday.toISOString());
			expect(mumsdag).toBeDefined();
			expect(mumsdag.date).toBe(yesterday.toISOString());

			const nextMumsdag = await db.getMumsdag(tomorrow.toISOString());
			expect(nextMumsdag).toBeDefined();
			expect(nextMumsdag.date).toBe(tomorrow.toISOString());
		});
	});
});
