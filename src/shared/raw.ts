export type RawProperty = {
  value?: string | number;
  label?: string;
  prefix?: string;
  postfix?: string;
};

export type RawSectionAttribute = {
  properties?: string[];
  elevated_properties?: string[];
  important_properties?: string[];
  loc_string?: string;
};

export type RawTooltipSection = {
  section_type?: string;
  section_attributes?: RawSectionAttribute[];
};

export type RawInfoSection = {
  loc_string?: string;
  properties_block?: { properties?: { important_property?: string }[] }[];
  basic_properties?: string[];
};

export type RawPropertyUpgrade = {
  name: string;
  bonus: string | number;
};

/**
 * Abilities: T1, T2, T3
 * Items: Street Brawl "enhanced" variants, ignored for now
 */
export type RawUpgrade = {
  property_upgrades?: RawPropertyUpgrade[];
};

type RawAssetBase = {
  class_name: string;
  name: string;
  description?: Record<string, string | undefined>;
  properties?: Record<string, RawProperty | undefined>;
  disabled?: boolean;
  /** abilities: T1-T3 | items: Street Brawl "enhanced" variants, ignored for now */
  upgrades?: RawUpgrade[];
};

export type RawShopItem = RawAssetBase & {
  type: "upgrade";
  shopable?: boolean;
  cost?: number;
  item_tier?: number;
  item_slot_type?: "weapon" | "spirit" | "vitality";
  activation?: string;
  component_items?: string[];
  tooltip_sections?: RawTooltipSection[];
};

export type RawAbility = RawAssetBase & {
  type: "ability";
  ability_type?: string;
  tooltip_details?: { info_sections?: RawInfoSection[] };
};

export type RawHero = {
  class_name: string;
  name: string;
  player_selectable?: boolean;
  disabled?: boolean;
  in_development?: boolean;
  items?: Record<string, string | undefined>;
};

export type RawAsset = RawShopItem | RawAbility;
