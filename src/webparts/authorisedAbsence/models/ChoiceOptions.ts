export interface IFormChoiceOptions {
  LevelOfStudy: string[];
  TravelOutside: string[];
  Status: string[];
}
export const emptyChoiceOptions = (): IFormChoiceOptions => ({ LevelOfStudy: [], TravelOutside: [], Status: [] });
