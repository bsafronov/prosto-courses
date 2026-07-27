import type { CoreDestinationLink } from "./courses";

export type HomeCatalogDestination = CoreDestinationLink & {
  title: string;
  capability: string;
  moduleTitle?: string;
  minutes: number;
  revision?: number;
};

export type HomeCatalogCourse = {
  id: string;
  title: string;
  destinations: HomeCatalogDestination[];
};
