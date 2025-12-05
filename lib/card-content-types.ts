export type BulletContent = {
  type: "bullet";
  items: string[];
};

export type SliderContent = {
  type: "slider";
  value: number;
  min: number;
  max: number;
  step: number;
};

export type CardContent = BulletContent | SliderContent;

export type IncomingContent = string[] | CardContent | null | undefined;

