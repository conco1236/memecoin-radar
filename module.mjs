// @ts-check
import { module } from "@prisma/composer";
import memecoinRadarService from "./service.mjs";

export default module("memecoin-radar", ({ provision }) => {
  provision(memecoinRadarService, { id: "memecoinradar" });
});
