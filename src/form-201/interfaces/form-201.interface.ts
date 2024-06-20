export interface IForm201 {
    id: string;
    objective: string;
    strategy: string;
    safetyMessage: string;
    urlOrganizationChart: string;
    thread: string;
    isolation: string;
    affectedAreas: string;
    tactics: string;
    coordinatesPc?: number[];
    coordinatesE?: number[];
    egressRoute: string;
    entryRoute: string;
    affectedAreasM: string;
    date: Date;
}
