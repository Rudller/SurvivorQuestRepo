export type Scenario = {
  id: string;
  name: string;
  description: string;
  introText: string;
  gameRules: string;
  stationIds: string[];
  sourceTemplateId?: string;
  createdAt: string;
  updatedAt: string;
};
