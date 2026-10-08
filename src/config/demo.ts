/**
 * Simulation timings (milliseconds). These only control the mock e-sign and courier progression.
 */
export const SIM_TIMINGS = {
  normal: { esignDelay: 6000, deliveryStep: 20000 },
  fast: { esignDelay: 2500, deliveryStep: 8000 },
} as const;

export const AI_STAGE_DELAY_MS = 380;
