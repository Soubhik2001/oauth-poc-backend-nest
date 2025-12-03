// 1. Define our Custom "Clean" City Interface globally
interface SimpleCity {
  name: string;
  country: string;
  lat: number;
  lon: number;
}

// 2. Module Declarations
declare module 'all-the-cities' {
  export interface City {
    cityId: number;
    name: string;
    altName: string;
    country: string;
    featureCode: string;
    adminCode: string;
    population: number;
    loc: {
      type: string;
      coordinates: [number, number];
    };
  }
  const cities: City[];
  export default cities;
}

declare module 'kdbush' {
  export default class KDBush {
    constructor(
      points: any[],
      getX: (p: any) => number,
      getY: (p: any) => number,
    );
  }
}

declare module 'geokdbush' {
  export function around<T>(
    index: any,
    lng: number,
    lat: number,
    maxResults?: number,
  ): (T | number)[]; // Returns Object OR Index Number
}
