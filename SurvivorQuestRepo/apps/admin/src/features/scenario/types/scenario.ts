export type Scenario = {
  id: string;
  name: string;
  description: string;
  stationIds: string[];
  sourceTemplateId?: string;
  createdAt: string;
  updatedAt: string;
};
