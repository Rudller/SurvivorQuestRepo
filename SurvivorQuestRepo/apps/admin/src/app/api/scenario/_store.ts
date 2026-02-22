export type ScenarioEntity = {
  id: string;
  name: string;
  description: string;
  stationIds: string[];
  createdAt: string;
  updatedAt: string;
};

const now = new Date().toISOString();

let scenarios: ScenarioEntity[] = [
  {
    id: "s-1",
    name: "Scenariusz integracyjny",
    description: "Wariant bazowy z trzema stanowiskami terenowymi i jednym quizem końcowym.",
    stationIds: ["g-1", "g-2", "g-4"],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "s-2",
    name: "Scenariusz nocny",
    description: "Krótki scenariusz dla mniejszej grupy, nacisk na reakcję kryzysową.",
    stationIds: ["g-4", "g-5"],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "s-3",
    name: "Scenariusz terenowy",
    description: "Dłuższy wariant terenowy z orientacją i zadaniami współpracy.",
    stationIds: ["g-2", "g-3"],
    createdAt: now,
    updatedAt: now,
  },
];

export function listScenarios() {
  return scenarios;
}

export function findScenarioById(id: string) {
  return scenarios.find((scenario) => scenario.id === id);
}

export function addScenario(scenario: ScenarioEntity) {
  scenarios = [scenario, ...scenarios];
  return scenario;
}

export function replaceScenario(updatedScenario: ScenarioEntity) {
  scenarios = scenarios.map((scenario) => (scenario.id === updatedScenario.id ? updatedScenario : scenario));
  return updatedScenario;
}

export function removeScenario(id: string) {
  scenarios = scenarios.filter((scenario) => scenario.id !== id);
}
