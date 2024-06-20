export interface IEmergency {
    id: string;
    name: string;
    locationDescription?: string;
    date: string;
    hour: string;
    type: string;
    coordinates?: number[];
    state: string;
    duration: string;
}
