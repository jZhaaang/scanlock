export type RawProperty = {
  value: string;
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
  section_attributes?: RawSectionAttribute;
};

export type RawItem = {
  class_name: string;
  name: string;
  type: "upgrade" | "ability" | "weapon";
  description: Record<string, string | undefined>;
  properties: Record<string, RawProperty | undefined>;

  shopable?: boolean;
  disabled?: boolean;
  cost?: number;
  item_tier?: number;
  item_slot_type?: "weapon" | "spirit" | "vitality";
  activation?: string;
  component_items?: string[];
  tooltip_sections?: RawTooltipSection[];
};

export type RawHero = {
  class_name: string;
  name: string;
  player_selectable?: boolean;
  disabled?: boolean;
  in_development?: boolean;
  items?: Record<string, string | undefined>;
};
