import { createStore } from "solid-js/store";
import { LegendCustomizationConfig } from "src/primal";

export type LegendCustomizationStyle = '' |
  'GOLD' |
  'AQUA' |
  'SILVER' |
  'PURPLE' |
  'PURPLEHAZE' |
  'TEAL' |
  'BROWN' |
  'BLUE' |
  'SUNFIRE';


export type MembershipStore = {
  legendCustomization: Record<string, LegendCustomizationConfig>,

}


export const emptyMembershipStore = (): MembershipStore => ({
  legendCustomization: {}
});

export const [membershipStore, updateMembershipStore] = createStore<MembershipStore>(emptyMembershipStore());
