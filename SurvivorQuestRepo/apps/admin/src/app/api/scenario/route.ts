import { NextResponse } from "next/server";
import {
	addScenario,
	findScenarioById,
	listScenarios,
	removeScenario,
	replaceScenario,
	type ScenarioEntity,
} from "./_store";

function sanitizeStationIds(value: unknown) {
	if (!Array.isArray(value)) {
		return [] as string[];
	}

	return value
		.map((item) => String(item).trim())
		.filter(Boolean)
		.filter((item, index, list) => list.indexOf(item) === index);
}

function isValidName(value: unknown) {
	return typeof value === "string" && value.trim().length >= 3;
}

export async function GET() {
	return NextResponse.json(listScenarios());
}

export async function POST(req: Request) {
	const body = (await req.json()) as {
		name?: string;
		description?: string;
		stationIds?: unknown;
	};

	const stationIds = sanitizeStationIds(body.stationIds);

	if (!isValidName(body.name) || stationIds.length === 0) {
		return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
	}

	const timestamp = new Date().toISOString();

	const newScenario: ScenarioEntity = {
		id: crypto.randomUUID(),
		name: body.name!.trim(),
		description: typeof body.description === "string" ? body.description.trim() : "",
		stationIds,
		createdAt: timestamp,
		updatedAt: timestamp,
	};

	return NextResponse.json(addScenario(newScenario), { status: 201 });
}

export async function PUT(req: Request) {
	const body = (await req.json()) as {
		id?: string;
		name?: string;
		description?: string;
		stationIds?: unknown;
	};

	const stationIds = sanitizeStationIds(body.stationIds);

	if (!body.id || !isValidName(body.name) || stationIds.length === 0) {
		return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
	}

	const currentScenario = findScenarioById(body.id);

	if (!currentScenario) {
		return NextResponse.json({ message: "Scenario not found" }, { status: 404 });
	}

	const updatedScenario: ScenarioEntity = {
		...currentScenario,
		name: body.name!.trim(),
		description: typeof body.description === "string" ? body.description.trim() : "",
		stationIds,
		updatedAt: new Date().toISOString(),
	};

	return NextResponse.json(replaceScenario(updatedScenario));
}

export async function DELETE(req: Request) {
	const body = (await req.json()) as {
		id?: string;
		confirmName?: string;
	};

	if (!body.id || typeof body.confirmName !== "string" || body.confirmName.trim().length === 0) {
		return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
	}

	const scenarioToDelete = findScenarioById(body.id);

	if (!scenarioToDelete) {
		return NextResponse.json({ message: "Scenario not found" }, { status: 404 });
	}

	if (scenarioToDelete.name !== body.confirmName.trim()) {
		return NextResponse.json({ message: "Scenario name confirmation does not match" }, { status: 400 });
	}

	removeScenario(body.id);
	return NextResponse.json({ id: body.id });
}
