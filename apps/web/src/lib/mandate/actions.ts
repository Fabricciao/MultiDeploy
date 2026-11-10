/** Actions de commercialisation proposées dans le mandat (règlement 5757-1997 : deux au moins). */
export const ACTIONS = ["sign", "internet", "social", "newspaper", "open_house", "brokers", "database"] as const;
export type MandateAction = (typeof ACTIONS)[number];
